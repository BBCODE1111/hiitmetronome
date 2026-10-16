import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {prepareAttack, speechBodyFrame} from '../scripts/recorded-voice/attack.mjs';

test('the approved Maeve count-in is preserved and the bundled AAC matches its manifest', () => {
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    const provenance = JSON.parse(readFileSync(new URL('../scripts/maeve-voice/source/manifest.json', import.meta.url)));
    const manifest = JSON.parse(readFileSync(new URL('../public/audio/counts-maeve-v6.json', import.meta.url)));
    assert.equal(hash(readFileSync(new URL('./fixtures/counts-maeve-v6.wav', import.meta.url))), provenance.approvedCommonWaveSha256);
    const context = vm.createContext({});
    vm.runInContext(readFileSync(new URL('../public/audio/voice-data.js', import.meta.url), 'utf8'), context);
    const bundled = context.MetronomeVoiceData;
    assert.equal(bundled.voice, 'Maeve');
    assert.equal(bundled.voiceId, '64cf4f1a-61c8-5938-9aea-83d12b2e1d13');
    assert.equal(hash(Buffer.from(bundled.encoded, 'base64')), manifest.sha256);
    assert.equal(hash(readFileSync(new URL('../public/audio/counts-maeve-v6.m4a', import.meta.url))), manifest.sha256);
    assert.equal(hash(readFileSync(new URL('../public/audio/counts-maeve-extra-v6.m4a', import.meta.url))), manifest.extra.sha256);
    assert.equal(hash(readFileSync(new URL('../public/audio/counts-maeve-words-v6.m4a', import.meta.url))), manifest.extended.sha256);
});

test('every prepared count has meaningful energy within 30 ms, not just a noise spike', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/audio/counts-maeve-v6.json', import.meta.url)));
    for (const [file, clips] of [
        ['counts-maeve-v6', manifest.clips], ['counts-maeve-extra-v6', manifest.extra.clips],
    ]) {
        const wave = readFileSync(new URL(`./fixtures/${file}.wav`, import.meta.url));
        for (const [word, variants] of Object.entries(clips)) for (const {offset, length} of variants) {
            if (word === 'rest') continue;
            const rms = [];
            for (let frame = 0; frame + 120 <= length; frame += 120) {
                let power = 0;
                for (let i = 0; i < 120; i++) power += (wave.readInt16LE(44 + (offset + frame + i) * 2) / 32768) ** 2;
                rms.push(Math.sqrt(power / 120));
            }
            const threshold = Math.max(...rms) * .3;
            const audible = rms.findIndex((value, i) => value >= threshold && rms[i + 1] >= threshold);
            assert.ok(audible >= 0 && audible * 5 <= 30, `${word}: strong attack at ${audible * 5} ms`);
        }
    }
});

test('shortening a breathy lead leaves the vowel waveform and pitch unchanged', () => {
    const rate = 24000;
    const pcm = Float32Array.from({length:rate / 2}, (_, i) =>
        (i < rate * .15 ? .002 : .6) * Math.sin(2 * Math.PI * 220 * i / rate));
    const body = speechBodyFrame(pcm, rate);
    const prepared = prepareAttack(pcm, rate, {word:'four'});
    assert.ok(prepared.removedFrames >= rate * .1);
    assert.ok(prepared.bodyFrame / rate <= .03);
    const vowel = pcm.slice(body);
    assert.deepEqual(prepared.pcm.slice(-vowel.length), vowel);
});

test('two and ten retain their initial stop burst as well as their vowel', () => {
    const rate = 24000;
    const pcm = Float32Array.from({length:rate / 2}, (_, i) => {
        const t = i / rate;
        const amplitude = t >= .02 && t < .03 ? .9 : t >= .15 ? .5 : .002;
        const hz = t < .15 ? 4000 : 220;
        return amplitude * Math.sin(2 * Math.PI * hz * t);
    });
    for (const word of ['two', 'ten']) {
        const prepared = prepareAttack(pcm, rate, {word});
        assert.ok(prepared.pcm.slice(0, rate * .015).some(value => Math.abs(value) > .7));
        const vowel = pcm.slice(speechBodyFrame(pcm, rate));
        assert.deepEqual(prepared.pcm.slice(-vowel.length), vowel);
        assert.ok(prepared.pcm.length < pcm.length - rate * .1);
    }
});
