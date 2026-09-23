# 📝 國中科技練習測驗

> 一款純靜態、無需後端的國中科技科隨機抽題練習系統。
> 開啟瀏覽器即可使用，支援是非題與選擇題，附解析說明。

---

## 🎯 功能特色

- 題數**可自訂**：是非／選擇各 0–40（0 為不考），開始鈕顯示實際總題數
- **選擇題選項內容隨機重排**（字母 A–D 順序固定、答案跟著內容走），防止背位置作答
- **倒數提醒**（可選）：時間到只提醒、不自動交卷
- **即時回饋**（可選）：作答後立刻顯示對錯，該題鎖定
- **作答紀錄**：每章顯示上次／最佳成績（存於瀏覽器 localStorage）
- **草稿續答**：未交卷離開可回來繼續（含剩餘秒數）
- **只重練錯題**：結果頁一鍵重練答錯的題目
- **全部解析開關**：結果頁可切換顯示所有題目解析（預設只顯示錯題）
- 作答完成後顯示**成績圓環動畫**與詳細檢討
- **鍵盤操作**：↑↓ 換題、A–D 作答、Enter 交卷
- 支援**附圖題目**（題目圖與選項圖，選項可多圖）
- 可換章節重新選題，或同章節**再練一次**
- 響應式設計，手機、平板皆可使用

---

## 📁 專案結構

```
tech-quiz-main/
│
├── index.html          # 主頁結構（樣式與邏輯外連）
├── styles.css          # 全部樣式
├── app.js              # 全部前端邏輯
├── chapters.json       # 章節清單（name/file/是非數/選擇數，由 validator 產出）
├── manifest.json       # PWA 設定
├── icon.svg            # PWA 圖示
├── sw.js               # PWA 離線快取（外殼 cache-first、題庫/圖片 network-first）
├── 啟動測驗.bat        # 雙擊啟動本地伺服器並開啟瀏覽器
│
├── questions/          # 題庫 JSON 檔
│   ├── u0101.json      # 1上 第1章 資訊科技導論
│   ├── u0104.json      # 1下 第4章 資料保護與資訊安全
│   ├── u0106.json      # 1下 第6章 數位著作合理使用
│   ├── u0201.json      # 2上 第1章 資訊倫理
│   ├── u0203.json      # 2上 第3章 資訊科技與相關法律
│   ├── u0204.json      # 2下 第4章 進階程式設計(2)
│   ├── u0205.json      # 2下 第5章 媒體與社會議題
│   ├── u0301.json      # 3上 第1章 系統平臺
│   ├── u0303.json      # 3上 第3章 網路技術與服務
│   ├── u0305.json      # 3下 第5章 資料數位化原理
│   └── u0306.json      # 3下 第3章 資訊產業與人類社會
│
├── images/             # 題目與選項附圖（PNG 格式，EMF 向量圖除外）
│   ├── u0101_*.png
│   ├── u0104_*.png
│   └── ...
│
├── docx_to_quiz_json.py  # 解析卷 .docx → 題庫 JSON＋圖片轉檔程式
├── rebuild_all.py        # 一鍵重建 11 章（`--check` 只比對不落地）
├── convert.bat           # 轉檔選單（雙擊選擇 docx 轉換）
├── tests/                # 測試：quiz_web.test.js（網頁回歸）＋validate_bank.py（資料驗證）＋run_tests.bat
├── CHANGELOG.md          # 變更紀錄（轉檔／改版後請接著記）
└── *-解析卷全.docx       # 轉檔來源（題目＋答案＋解析同一份文件）
```

---

## 📊 題庫統計

| 章節代碼 | 章節名稱 | 是非題 | 選擇題 | 合計 | 含圖題數 | 含解析 |
|----------|----------|:------:|:------:|:----:|:--------:|:------:|
| u0101 | 1上 第1章 資訊科技導論 | 55 | 57 | 112 | 2 | 28 |
| u0104 | 1下 第4章 資料保護與資訊安全 | 90 | 87 | 177 | 8 | 30 |
| u0106 | 1下 第6章 數位著作合理使用 | 86 | 87 | 173 | 17 | 30 |
| u0201 | 2上 第1章 資訊倫理 | 81 | 87 | 168 | 0 | 81 |
| u0203 | 2上 第3章 資訊科技與相關法律 | 85 | 84 | 169 | 0 | 80 |
| u0204 | 2下 第4章 進階程式設計(2) | 83 | 85 | 168 | 109 | 43 |
| u0205 | 2下 第5章 媒體與資訊科技相關社會議題 | 85 | 87 | 172 | 2 | 35 |
| u0301 | 3上 第1章 系統平臺 | 79 | 82 | 161 | 6 | 44 |
| u0303 | 3上 第3章 網路技術與服務 | 87 | 88 | 175 | 0 | 40 |
| u0305 | 3下 第5章 資料數位化原理 | 124 | 115 | 239 | 13 | 99 |
| u0306 | 3下 第3章 資訊產業與人類社會 | 150 | 150 | 300 | 13 | 67 |
| **合計** | | **1005** | **1009** | **2014** | **170** | **577** |

---

## 🚀 使用方式

### 方法一：直接開啟（本機）

> ⚠️ 部分瀏覽器對本機 `fetch()` 有跨來源限制，建議使用方法二。

雙擊 `index.html` 開啟（Chrome 可能需要搭配允許本機存取的設定）。

### 方法二：本地伺服器（推薦）

```bash
# 在專案根目錄執行
python -m http.server 8000
```

開啟瀏覽器前往：`http://localhost:8000`

### 方法三：部署至靜態主機

直接上傳至 GitHub Pages、Netlify、Vercel 等靜態託管服務，無需任何後端設定。

---

## 📋 題庫 JSON 格式說明

每個 `questions/uXXXX.json` 的結構如下：

```json
{
  "chapter": "2下 第4章 進階程式設計(2)",
  "questions": [
    {
      "id": "u0204_T001",
      "type": "是非",
      "text": "題目文字",
      "options": [
        { "key": "A", "text": "是", "kind": "text" },
        { "key": "B", "text": "否", "kind": "text" }
      ],
      "answer": "B",
      "explanation": "解析說明（可為空字串）",
      "images": {
        "stem": [],
        "options": {}
      }
    },
    {
      "id": "u0204_C059",
      "type": "選擇",
      "text": "題目文字 {圖1}",
      "options": [
        { "key": "A", "text": "選項一", "kind": "text" },
        { "key": "B", "text": "選項二", "kind": "text" },
        { "key": "C", "text": "", "kind": "image" },
        { "key": "D", "text": "選項四", "kind": "text" }
      ],
      "answer": "C",
      "explanation": "解析說明",
      "images": {
        "stem": ["u0204_C059_stem.png"],
        "options": { "C": ["u0204_C059_C.png"] }
      }
    }
  ]
}
```

### 欄位說明

| 欄位 | 型別 | 說明 |
|------|------|------|
| `chapter` | string | 章節名稱 |
| `id` | string | 題號（如 `u0204_C059`；T＝是非區題序、C＝選擇區題序） |
| `type` | string | `"是非"` 或 `"選擇"` |
| `text` | string | 題目文字；`{圖N}` 為內嵌圖片標記，對應 `images.stem` 第 N 張 |
| `options` | array | 選項清單，每項含 `key`（選項代號）、`text`、`kind`（`text` 文字選項／`image` 純圖選項） |
| `answer` | string | 正確答案的 key 值 |
| `explanation` | string | 解析說明，可為空字串 |
| `images.stem` | array | 題幹附圖檔名陣列（放在 `images/` 目錄下） |
| `images.options` | object | 選項附圖，key 為選項代號，value 為**檔名清單**（一個選項可有多張圖） |

> **注意：** `answer` 為空字串的題目會在抽題時**自動排除**。目前全庫 2014 題答案齊全，無缺答。

---

## ➕ 新增題庫

1. 依照上方 JSON 格式建立新檔，存放至 `questions/` 目錄（例如 `u0105.json`）。
2. 重新產出 `chapters.json`（含新章節與每章題數）：
   ```bash
   python tests/validate_bank.py --write-chapters
   ```
   （驗證通過才會產出；有缺答或缺圖會先報錯）
3. 若題目含圖，將圖片檔放入 `images/` 目錄，並在 JSON 中填入對應檔名。

> **注意：** 章節清單由 `chapters.json` 提供（網頁選章後才載入該章 JSON）；直接加檔不更新 `chapters.json` 的話，首頁不會出現新章節。

---

## 🔄 題庫轉檔（解析卷 → JSON）

題庫由 `docx_to_quiz_json.py` 從「解析卷」Word 直接產生（題目＋答案＋解析寫在同一份文件，不需 CSV）：

```bash
# 雙擊 convert.bat 用選單挑檔案，或直接下指令：
python docx_to_quiz_json.py u0101-解析卷全.docx --chapter "1上 第1章 資訊科技導論" --png --inline-markers

# 一鍵重建全部 11 章（映射寫在 rebuild_all.py 內）：
python rebuild_all.py
python rebuild_all.py u0305              # 只重建指定章節
python rebuild_all.py --check            # 不落地：重建到暫存目錄並與現況 diff
```

- 預設輸出 `questions/{章節代碼}.json`（如 `questions/u0101.json`），圖片輸出至 `images/`（`--png` 需 Pillow，會轉成 PNG）
- 解析卷排版：是非題／選擇題兩段，各自從 1 開始自動編號；每題為 `(   ) 題目…`、`答案：…`、`解析：…`（可省略）三段；選項可接在題幹同段或另成一段 `(Ａ)…(Ｂ)…(Ｃ)…(Ｄ)…`
- 轉檔特殊處理：
  - 題幹尾巴的命題後設資料（難易度／知識向度／出處）會自動剝除
  - 答案先做 NFKC 正規化（全形→半形）再剝外層括號後判斷（如 `(○)`、`（Ｂ）`）
  - **是非段誤貼的選擇題會自動重判**：題幹內嵌 `(Ａ)(Ｂ)…` 且答案是字母時，改判為選擇題（保留原題號，如 `u0305_T024`）
  - EMF／WMF 向量圖無法轉 PNG，保留原格式（瀏覽器無法顯示，轉檔時會警告）。手動替換步驟：用 Word／LibreOffice 把該圖另存成 PNG，以同規則命名（如 `u0305_C107_stem.png`）放入 `images/`，並把該題 `images.stem` 改指 PNG 檔
  - 完全重複的題目只警告不刪除（加 `--dedupe` 可移除）

> **注意：** `convert.bat`、`run_tests.bat`、`啟動測驗.bat` 必須保持 **Big5＋CRLF** 編碼（Windows cp950），勿用 UTF-8 另存，否則中文會亂碼、選單失效。`rebuild_all.py` 為 UTF-8 無此問題。

---

## ✅ 測試

```bash
node tests/quiz_web.test.js   # 網頁回歸（抽題／計時／草稿／鍵盤／紀錄／重練…共 61 項）
python tests/validate_bank.py # 資料驗證（答案非空、圖片引用存在、重複警告、每章統計）

# 或雙擊 tests/run_tests.bat 一次跑完（純 ASCII，不受 bat 編碼影響）
```

- 改版或重跑轉檔後請先跑過測試再部署；`validate_bank.py` 失敗（exit 1）表示有缺答或缺圖
- PWA 離線請手動驗證：開頁載入一次後關網路重整，應可正常作答（`sw.js` v2：外殼 cache-first、題庫/圖片 network-first 兜底）

---

## 🛠️ 技術架構

| 技術 | 用途 |
|------|------|
| HTML5 / CSS3 | 頁面結構與樣式（`index.html`＋`styles.css`） |
| Vanilla JavaScript | 題庫載入、隨機抽題、答題邏輯（`app.js`） |
| localStorage | 作答紀錄、草稿續答、出題設定（純本機，不上傳） |
| Service Worker | PWA 離線快取（`sw.js`＋`manifest.json`；外殼 cache-first、題庫/圖片 network-first） |
| Noto Sans TC / DM Mono | Google Fonts 字型（需連線） |
| CSS 自訂屬性 | 主題色彩統一管理 |

**無任何框架或套件依賴**（字型除外）；`index.html`＋`styles.css`＋`app.js`＋`chapters.json` 即為完整應用。
