<div align="center">

# Interval Metronome

**從穩定跟拍，到一步步加速。**

給吉他與樂器練習用的線上節拍器。設定自己的拍號、加速目標與休息時間，跟著語音預備拍開始練習。

**[▶ 開啟節拍器](https://bbcode1111.github.io/intervalmetronome/)**

免安裝 · 免登入 · 開啟瀏覽器即可使用

<a href="https://bbcode1111.github.io/intervalmetronome/">
  <img src="docs/images/overview.jpg" alt="Interval Metronome 主介面：120 BPM、預設 4/4 拍，包含速度、音量、拍號、加速與休息設定" width="520">
</a>

</div>

## 按照你的節奏練習

| 功能 | 可以怎麼用 |
| --- | --- |
| **30–400 BPM** | 用滑桿或直接輸入速度，從慢速拆解到快速練習。 |
| **自由輸入拍號** | 每小節拍數接受正整數，搭配四分或八分音符；預設為 4/4。 |
| **柔和女聲預備拍** | 跟著 Maeve 女聲的 one、two、three、four 進入節奏；開始與變速時的提示可分別開關。 |
| **自動逐步加速** | 設定每幾小節增加多少 BPM，達到目標後維持速度。 |
| **練習與休息交替** | 設定每加速幾次休息一次，以及休息秒數，結束後繼續練習。 |
| **六種節拍音色** | Rimshot、Woodblock、Clave 加上三款 Classic 音色，播放中也能切換。 |
| **寬範圍音量與節拍燈** | 從靜音、輕聲到響亮拍點，搭配閃爍的 PULSE 燈掌握拍點。 |

## 三步開始

1. **設定速度與拍號**：調整 Tempo、Beats / MSR 與 Note Value。
2. **選擇練習方式**：固定速度練習時關閉 Interval Training Engine；需要循序加速時開啟並設定目標。
3. **按 START**：跟著預備拍進入練習，隨時按 STOP 停止。

## 挑選清楚聽得到的拍點

在 **Tone** 選擇Electronic、Mechanical、Rimshot 或 Cowbell。樂器聲較大時，可先試 Rimshot 或 Cowbell，再調整 **Master Volume**；100% 使用完整的乾淨輸出範圍，低音量端可以細調。介面以英文顯示，拍點增加聲音主體的能量，維持峰值餘量。

音色以經典電子與機械節拍器常見類型為參考，皆為本專案原創合成，沒有使用品牌採樣。參考 [KORG KDM-3 的機械聲、邊擊與牛鈴](https://www.korg.com/us/products/tuners/kdm_3/) 、[BOSS DB-90 的多音色設計](https://www.boss.info/global/products/db-90/) 及 [Roland TR-808 的 Rim Shot / Claves](https://support.roland.com/hc/en-us/articles/201963539-TR-808-Technical-Specifications)。

軟體混音保留峰值餘量，避免拍點與 Maeve 語音相加時削波。實際最大聲量仍取決於裝置、系統音量與喇叭；改版後請從適合自己的音量開始調整。

## 自由拍號：輸入你需要的拍數

三拍、五拍、七拍都可以。**Beats / MSR** 直接輸入每小節拍數，**Note Value** 選擇 `/4` 或 `/8`。下圖示範 7/8；拍數只接受正整數，不接受小數。

<p align="center">
  <img src="docs/images/custom-meter.jpg" alt="自由拍號示例：每小節 7 拍，音符值選擇 /8，畫面顯示 7/8 TIME" width="640">
</p>

BPM 以四分音符計算，因此同樣的 BPM 下，選擇 `/8` 時的拍點間隔是 `/4` 的一半。

## 讓節拍器陪你逐步加速

例如從 **120 BPM 練到 160 BPM**：每 **8 小節**加快 **5 BPM**，每加速 **4 次**休息 **20 秒**，休息後接著練。

<p align="center">
  <img src="docs/images/interval-training.jpg" alt="間隔練習示例：每 8 小節增加 5 BPM，目標 160 BPM；每加速 4 次休息 20 秒" width="640">
</p>

| 面板設定 | 意思 |
| --- | --- |
| **Each (MSR)** | 每幾個練習小節加速一次。 |
| **Incr (BPM)** | 每次增加的速度。 |
| **Target BPM** | 想練到的目標速度。 |
| **Every … Increments** | 每加速幾次安排一次休息。 |
| **Wait … Sec** | 每次休息的秒數。 |

## 用預備拍接上節奏

- **START CUE**：開始練習與休息結束時，先播放一小節語音預備拍。
- **TRANS CUE**：速度提高後，用新速度報數，幫助你接上下一段。

語音報數配合當前拍號與速度，與每個拍點同步。休息時會提示「Rest」，面板顯示倒數時間與下一段速度。

報數與休息提示使用同一款 Maeve 女聲。常用 1–10 報數的各種長度已事先做好，高速播放時維持原本音高，不必在練習中即時生成語音。

> 練習時請讓頁面保持在前景、螢幕保持開啟。速度很快或拍數很大時，語音會變得緊湊；Master Volume 同時控制節拍與語音音量。

---

**[開始練習 →](https://bbcode1111.github.io/intervalmetronome/)** · [素材與授權](THIRD_PARTY_NOTICES.md)
