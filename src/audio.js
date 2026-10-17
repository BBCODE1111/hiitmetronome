// Clicks and recorded count-in share one AudioContext and one sample clock.
// Native speech synthesis has an independent queue and cannot schedule a beat.
(() => {
    // Give the retained consonant a short lead-in so the body of the number
    // reaches the click. Fixed lead preserves count spacing across BPM changes.
    const countLeadSeconds = .02;
    const units = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
        'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const scales = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'];

    function numberWords(number) {
        if (!Number.isSafeInteger(number) || number < 0) throw new RangeError('Expected a nonnegative safe integer');
        if (number === 0) return ['zero'];
        const words = [];
        for (let scale = 0; number > 0; scale++, number = Math.floor(number / 1000)) {
            let group = number % 1000;
            if (!group) continue;
            const part = [];
            if (group >= 100) { part.push(units[Math.floor(group / 100)], 'hundred'); group %= 100; }
            if (group >= 20) { part.push(tens[Math.floor(group / 10)]); group %= 10; }
            if (group) part.push(units[group]);
            if (scales[scale]) part.push(scales[scale]);
            words.unshift(...part);
        }
        return words;
    }

    // Common count-ins are bundled with the page and decoded before START.
    let recorded, recordedLoading, extraLoading, extraReady = false;
    function decoderFor(context) {
        const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        return Offline ? new Offline(1, 1, MetronomeVoiceData.sampleRate) : context;
    }
    function readVariants(bank, manifest) {
        const ratio = bank.sampleRate / MetronomeVoiceData.sampleRate, clips = {};
        const {max, abs} = Math;
        for (const [word, variants] of Object.entries(manifest)) {
            clips[word] = variants.map(({offset, length}) => {
                const start = Math.round(offset * ratio);
                const end = Math.min(bank.length, Math.round((offset + length) * ratio));
                const pcm = bank.getChannelData(0).slice(start, end);
                const peak = pcm.reduce((m, sample) => max(m, abs(sample)), 0);
                const first = pcm.findIndex(sample => abs(sample) > peak * .004);
                if (first < 0) throw new Error('Silent recorded voice');
                const trimmed = pcm.slice(first);
                const fade = Math.min(Math.round(bank.sampleRate * .001), trimmed.length);
                for (let i = 0; i < fade; i++) trimmed[i] *= (i + 1) / fade;
                return trimmed;
            });
        }
        return clips;
    }
    function preload(context) {
        if (recordedLoading) return recordedLoading;
        const decoder = decoderFor(context);
        if (!decoder) return Promise.resolve();
        recordedLoading = (async () => {
            const bytes = Uint8Array.from(atob(MetronomeVoiceData.encoded), char => char.charCodeAt(0));
            const bank = await decoder.decodeAudioData(bytes.buffer);
            recorded = {clips:readVariants(bank, MetronomeVoiceData.clips), sampleRate:bank.sampleRate};
        })().catch(error => { recordedLoading = null; throw error; });
        return recordedLoading;
    }
    function preloadExtra(context) {
        if (extraLoading) return extraLoading;
        const decoder = decoderFor(context);
        if (!decoder) return Promise.resolve();
        extraLoading = (async () => {
            await preload(context);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            try {
                const response = await fetch(MetronomeVoiceData.extra.src, {signal:controller.signal});
                if (!response.ok) throw new Error('Extra counts unavailable');
                const bank = await decoder.decodeAudioData(await response.arrayBuffer());
                Object.assign(recorded.clips, readVariants(bank, MetronomeVoiceData.extra.clips));
                extraReady = true;
            } finally { clearTimeout(timeout); controller.abort(); }
        })().catch(error => { extraLoading = null; throw error; });
        return extraLoading;
    }

    const tones = ['electronic', 'mechanical', 'rimshot', 'cowbell'];

    // Original synthesized sounds, rendered once per device rate. A fuller
    // 55 ms body raises loudness without increasing the .94 peak ceiling.
    // End by the next 400 BPM eighth-note cue's 20 ms articulation lead.
    function clickPCM(sampleRate, tone, strong) {
        const pcm = new Float32Array(Math.floor(sampleRate * .055));
        const pitch = strong ? 1.22 : 1;
        let noiseState = 173;
        for (let i = 0; i < pcm.length; i++) {
            const t = i / sampleRate;
            const sine = (hz, decay) => Math.sin(2 * Math.PI * hz * pitch * t) * Math.exp(-t / (decay * 8));
            noiseState = (Math.imul(noiseState, 1664525) + 1013904223) | 0;
            const noise = (noiseState / 2147483648) * Math.exp(-t / .002);
            let sample;
            switch (tone) {
                case 'mechanical':
                    sample = sine(780, .011) + .55 * sine(1960, .008) + .35 * sine(3350, .005) + .25 * noise;
                    break;
                case 'rimshot':
                    sample = sine(1720, .012) + .65 * sine(2310, .009) + .4 * sine(3840, .006) + .65 * noise;
                    break;
                case 'cowbell':
                    sample = sine(640, .021) + .85 * sine(945, .019) + .3 * sine(1280, .012) + .2 * sine(1890, .01);
                    break;
                default:
                    sample = sine(1320, .016) + .3 * sine(2640, .009);
            }
            // Sub-millisecond attack and a short tail fade avoid discontinuities.
            pcm[i] = sample * Math.min(1, t / .00025) * Math.min(1, (pcm.length - 1 - i) / (sampleRate * .004));
        }
        const peak = pcm.reduce((m, value) => Math.max(m, Math.abs(value)), 0);
        for (let i = 0; i < pcm.length; i++) pcm[i] *= .94 / peak;
        return pcm;
    }

    // Reserve a known peak budget for a simultaneous click. A constant scale
    // preserves the recording's timbre and dynamics; no clipping or limiter.
    function voiceHeadroom(pcm) {
        const peak = pcm.reduce((m, value) => Math.max(m, Math.abs(value)), 0);
        if (peak > .70) for (let i = 0; i < pcm.length; i++) pcm[i] *= .70 / peak;
        return pcm;
    }

    class Engine {
        constructor(context) {
            this.context = context;
            this.master = context.createGain();
            this.master.connect(context.destination);
            this.active = new Set();
            this.cache = new Map();
            this.tone = 'electronic';
            this.clickBuffers = new Map();
            // Eight tiny buffers, shared by every beat, including live switches.
            for (const tone of tones) for (const strong of [false, true]) {
                const pcm = clickPCM(context.sampleRate || 48000, tone, strong);
                const buffer = context.createBuffer(1, pcm.length, context.sampleRate || 48000);
                buffer.getChannelData(0).set(pcm);
                this.clickBuffers.set(`${tone}:${strong}`, buffer);
            }
        }

        setVolume(value) {
            const level = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
            const gain = this.master.gain, now = this.context.currentTime;
            const current = gain.value;
            // Audio taper: fine control near silence, full clean output at 100%.
            // A 5 ms ramp prevents slider movements from introducing clicks.
            gain.cancelScheduledValues(now);
            gain.setValueAtTime(current, now);
            gain.linearRampToValueAtTime(level * level, now + .005);
        }

        setTone(tone) { this.tone = tones.includes(tone) ? tone : 'electronic'; }

        async ready(count = 4) {
            await preload(this.context);
            await Promise.all([
                count > 4 ? preloadExtra(this.context) : undefined,
                count > 10 ? this.loadExtended() : undefined,
            ]);
        }

        hasCounts(count) { return !!recorded && (count <= 4 || extraReady) && (count <= 10 || !!this.clips); }

        async loadExtended() {
            if (!this.loading) {
                this.loading = this.load().catch(error => { this.loading = null; throw error; });
            }
            return this.loading;
        }

        async load() {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            try {
                const [manifestResponse, waveResponse] = await Promise.all([
                    fetch(MetronomeVoiceData.extended.manifest, { signal: controller.signal }),
                    fetch(MetronomeVoiceData.extended.src, { signal: controller.signal }),
                ]);
                if (!manifestResponse.ok || !waveResponse.ok) throw new Error('Voice download failed');
                const [manifest, data] = await Promise.all([manifestResponse.json(), waveResponse.arrayBuffer()]);
                // Explicit sample rate keeps sprite offsets correct if the device
                // resamples the voice WAV to 44.1 or 48 kHz audio.
                const bank = await this.context.decodeAudioData(data);
                const clips = {};
                for (const [word, range] of Object.entries(manifest.clips)) {
                    const begin = Math.round(range.offset * bank.sampleRate / manifest.sampleRate);
                    const requestedEnd = Math.round((range.offset + range.length) * bank.sampleRate / manifest.sampleRate);
                    // Browsers may floor the decoded bank's final resampled frame.
                    const end = Math.min(bank.length, requestedEnd);
                    if (!Number.isFinite(begin) || !Number.isFinite(requestedEnd) || begin < 0 || requestedEnd > bank.length + 1 || end <= begin) throw new Error('Invalid voice bank');
                    clips[word] = bank.getChannelData(0).slice(begin, end);
                }
                for (const word of [...units, ...tens.filter(Boolean), ...scales.filter(Boolean), 'hundred', 'rest', 'next', 'speed']) {
                    if (!clips[word]?.length) throw new Error(`Missing voice: ${word}`);
                }
                this.sampleRate = bank.sampleRate;
                this.clips = clips;
            } finally { clearTimeout(timeout); controller.abort(); }
        }

        bufferFor(words, maxSeconds = Infinity) {
            const key = `${words.join(' ')}:${maxSeconds}`;
            if (this.cache.has(key)) return this.cache.get(key);
            if (words.length === 1 && recorded?.clips[words[0]]) {
                const variants = recorded.clips[words[0]];
                const pcm = variants.find(samples => samples.length / recorded.sampleRate <= maxSeconds) || variants[variants.length - 1];
                const buffer = this.context.createBuffer(1, pcm.length, recorded.sampleRate);
                buffer.getChannelData(0).set(voiceHeadroom(pcm.slice()));
                if (this.cache.size >= 64) this.cache.delete(this.cache.keys().next().value);
                this.cache.set(key, buffer);
                return buffer;
            }
            if (!this.clips) throw new Error('Extended voice is not ready');
            const gap = Math.round(this.sampleRate * 0.008);
            const length = words.reduce((sum, word) => sum + this.clips[word].length, 0) + gap * (words.length - 1);
            const original = new Float32Array(length);
            let offset = 0;
            for (const word of words) { original.set(this.clips[word], offset); offset += this.clips[word].length + gap; }
            const pcm = voiceHeadroom(MetronomeStretch.fitSpeech(original, this.sampleRate, maxSeconds));
            const buffer = this.context.createBuffer(1, pcm.length, this.sampleRate);
            buffer.getChannelData(0).set(pcm);
            // An arbitrary meter must never allocate audio for all its beats.
            if (this.cache.size >= 64) this.cache.delete(this.cache.keys().next().value);
            this.cache.set(key, buffer);
            return buffer;
        }

        track(source, nodes = []) {
            this.active.add(source);
            source.onended = () => {
                this.active.delete(source);
                source.disconnect();
                for (const node of nodes) node.disconnect();
            };
        }

        voice(words, time, duration) {
            const buffer = this.bufferFor(words, duration * 0.985);
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            // Keep the speaker's original pitch. Timing changes are rendered
            // into the buffer in advance; playback never speeds up the waveform.
            source.playbackRate.value = 1;
            source.connect(this.master);
            this.track(source);
            source.start(time);
            return source;
        }

        count(number, time, beatDuration) {
            return this.voice(numberWords(number), time - countLeadSeconds, beatDuration);
        }

        prepareCounts(beats, beatDuration) {
            // Prime common count-ins before starting the clock, bounding work
            // for arbitrary meters. Longer counts are cached on demand.
            for (let count = 1; count <= Math.min(beats, 16); count++) {
                this.bufferFor(numberWords(count), beatDuration * 0.985);
            }
        }

        rest(bpm, time, duration) {
            return this.voice(['rest'], time, duration);
        }

        click(time, strong, withVoice = false) {
            const source = this.context.createBufferSource();
            const level = this.context.createGain();
            source.buffer = this.clickBuffers.get(`${this.tone}:${!!strong}`);
            // .70 voice + .24 click <= .94, even if their peaks coincide.
            level.gain.value = withVoice ? .24 / .94 : 1;
            source.connect(level);
            level.connect(this.master);
            this.track(source, [level]);
            source.start(time);
            return source;
        }

        stop() {
            for (const source of this.active) { source.stop(); source.disconnect(); }
            this.active.clear();
        }
    }
    globalThis.MetronomeAudio = { Engine, numberWords, preload, preloadExtra, countLeadSeconds, tones, clickPCM };
    preload().then(() => preloadExtra()).catch(() => {});
    // Failed optional background loads never prevent the bundled 1–4 count-in.
})();
