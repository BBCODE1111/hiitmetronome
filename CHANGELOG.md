# Changelog

## 1.6.0

- 更名為「吉他健身房 HIIT METRONOME」，網址改為 /hiitmetronome/。
- 面板右下角加上低調的 powered by BBCODE1111；品牌名稱調亮，中文字以金色顯示。
- README 改以 HIIT 間歇訓練的方式說明，並更新全部截圖，新增練習中／休息中畫面。

## 1.5.1

- Add a Punchy attack group with Rimshot, Woodblock and Clave; make Rimshot the default and retain the three Classic tones.

- Increase beat loudness with a fuller 55 ms sound while retaining the clean peak ceiling and fast-tempo spacing.
- Use English throughout the interface, tone choices and status messages.

## 1.5.0

- 擴大音量控制的實用範圍，重做較響亮的拍點；低音量更細緻，滑動時平順過渡。
- 新增電子嗶聲、機械木聲、邊擊與牛鈴四種原創合成音色，可在播放中切換。
- 對語音與拍點預留固定峰值餘量，最大音量也不以削波換取響度；保留 Maeve 音高及變速同步。
- 音色啟動時預先產生並重用，不增加音檔下載或每拍合成負擔。

## 1.4.1

- 將預設聲音改為試聽後選定的 Maeve；1–4 與 Rest 沿用已確認的音檔與處理方式。
- 補齊同一聲音的 5–10 與延伸數字，保留自由拍數、變速、休息與音量功能。
- 納入原始錄音、分段範圍與離線產生器；重建語音不需 API、憑證或下載模型。
- 發布包移除歷史聲音比較頁，只包含目前啟用的語音。

## 1.4.0（試聽版，未發布）

- 將預備拍、延伸數字及休息提示統一換成 Kokoro Heart 女聲，原始語音以正常速度產生。
- 1–10 的高速長度版本於發布前處理，維持原音高與既有音訊時鐘；常用報數播放時不執行語音生成或時間壓縮。
- 發布包只包含目前啟用的語音庫；舊版錄音仍保留在原始碼中。
- 更新語音版本網址，避免舊快取混用新舊語音。

## 1.3.1

- Shorten the breathy/quiet openings of recorded counts 1–10 before preparing tempo variants. Retain short consonants and explicitly preserve the initial t burst of two/ten; leave the main vowel waveform unchanged during attack preparation.
- Give all count samples a fixed 20 ms articulation lead on the same audio clock. Preserve exact beat spacing and prepare enough scheduling headroom after a delayed callback.
- Replace the noise-only synchronization check with an additional sustained speech-body check. Cover all ten recorded numbers, stop/restart and rest transitions, and preserve the lightweight preloaded core.

## 1.3.0

- Use Giselle real voice recordings from the CC0 Kenney Voiceover Pack for counts 1–10. Prepare duration variants offline; choose the longest available version that fits each beat at unchanged playback pitch. Keep every-beat synchronization and the default 4/4.
- Bundle an approximately 90 KB AAC core (1–4 plus Rest) with the page, decode before START, and load 5–10 in the background. Load the compressed Sarah supplement only for larger meters. Default startup no longer waits for the old 911 KB WAV or runtime time stretching.
- Keep arbitrary positive integer meters; apply a live meter edit after its voice assets are ready at a complete boundary. Rest uses a short spoken prompt; the next BPM remains visible on the panel.
- Add regressions for offline default startup and prebuilt 1–10 counts at every supported BPM/note value, plus browser startup timing instrumentation.
- Verification: 23 automated tests; 36 real-browser renders / 360 counts with maximum voice/click onset difference 0.292 ms and no cross-beat overlap. A local Chrome cold-page test at 1 Mbps / 150 ms latency prepared the core in 1.48 seconds, then detected the first voice signal 54 ms after START. This measures browser audio, not iPhone Safari or hardware output latency.

## 1.2.0

- Replace the eSpeak voice with the selected C preview voice, Kokoro Sarah. The original browser version did not identify a particular system voice, so this release does not claim an exact match to that voice.
- Keep `AudioBufferSourceNode.playbackRate` at 1 at every BPM. Leave cues unchanged when they fit; otherwise render pitch-preserving WSOLA time compression before scheduling. Slow tempos no longer stretch the voice down in pitch.
- Prepare the common startup counts before scheduling the first beat. Keep shared audio-clock synchronization, custom integer meters and the default 4/4.
- Add pure-tone pitch regression tests at 24/44.1/48 kHz down to the 400 BPM /8 cue window, plus checks that uncompressed speech is bit-identical to its source. All 20 tests pass.
- Browser verification of Sarah across 36 renders / 360 spoken beats: maximum voice/click signal-onset difference 0.454 ms; no cross-beat overlap. First 120 BPM /4 start and repeat 400 BPM 7/8 start both produced all expected spoken counts. Very short windows can still reduce speech intelligibility, without the former pitch increase.

## 1.1.0

- Replace browser speech synthesis with bundled, silence-trimmed voice samples. Spoken counts and clicks now start on the same Web Audio timestamp; each complete number fits within its beat at the current tempo.
- Wait for successful voice download/decode before the first beat. Cancelled starts cannot launch stale schedulers, failed loads can be retried, and stopping cancels both clicks and voice.
- Keep the initial 4/4 meter. Beats / MSR remains direct numeric entry, accepts positive safe integers without the previous 16-beat cap, and rejects decimals instead of truncating them. Apply live meter edits at a complete measure/count-in boundary.
- Assemble compound numbers on demand using a bounded cache; include rest announcements and one shared volume control.
- Handle 44.1/48 kHz resampling boundaries and late scheduler callbacks without a burst of missed beats.
- Add reproducible voice generation and local browser QA pages. Browser waveform validation: 36 renders / 360 spoken beats, maximum measured voice/click signal-onset difference 0.046 ms, no cross-beat voice overlap, and silent output after mute/stop. Real-time analyser checks cover cold and repeat starts. These measurements do not certify acoustic output on every device.

## 1.0.1

- Restore the original uninterrupted speech queue during count-in. Version 1.0.0 called `speechSynthesis.cancel()` before every number; cancellation now occurs only when stopping playback.
- Preserve the original cue lead time (30 ms) and speech-rate formula.
- Add regression coverage for startup count-in at every integer BPM from 30 through 400 in quarter- and eighth-note signatures (742 combinations), and for count-in after a tempo increment. Check all four spoken-number requests against their corresponding beat times and preserve the original speech-rate formula.
- Version the JavaScript URL so reloading the page fetches the corrected file.

The automated checks verify scheduling and queue operations, not the acoustic timing of every device's speech engine.

## 1.0.0

- Package the original application, Git history, self-hosted styles/fonts, tests and GitHub Pages deployment.
