# 變更紀錄

格式：日期＋變更＋題數變化。轉檔或改版後請接著往下記，README 的統計表才對得上。

## 2026-09-23 — sw.js 升 v2
- `sw.js`：`CACHE='tech-quiz-v2'`（activate 自動清 v1）；App 外殼維持 cache-first，`questions/`＋`images/` 改 network-first（有網拿新、斷線吃快取）；路徑比對改比對路徑段，子路徑部署（如 `/tech-quiz/`）適用；預載清單加 `icon.svg`
- 題數：2014，無變動

## 2026-09-23 — 工程化整批
- git 本地版控（init＋.gitignore，不 commit、不設遠端，由使用者自行上傳）
- `tests/`：`quiz_web.test.js`（網頁回歸 61 項）、`validate_bank.py`（答案／圖片／重複驗證＋統計）、`run_tests.bat` 一鍵測試
- `rebuild_all.py`：11 章映射一鍵重建；`--check` 與現況比對全一致（JSON＋圖片集合）
- `index.html` 拆成 `styles.css`＋`app.js`；`CHAPTERS` 移到 `chapters.json`（由 validator 產出，含每章題數）
- 選項 `.opt` 改 `<button>`＋`aria-pressed`＋focus 樣式
- 圖片 `onerror` 備援（隱藏破圖＋console 警告）
- 題庫 lazy-load：首頁只抓 `chapters.json`，開考前才抓該章 JSON（失敗顯示錯誤訊息）
- PWA：`manifest.json`＋`icon.svg`＋`sw.js`（同源 cache-first，可離線作答）
- 題數：2014（是非 1005／選擇 1009），與前版一致

## 2026-09-23 — T024 重判＋README 更新
- `docx_to_quiz_json.py`：是非段誤貼的選擇題自動重判（`u0305_T024` 改判為選擇，答案 B；id 保留原題號）
- 重跑 u0305：239 題（是非 124／選擇 115），全庫 0 缺答；其餘 10 章雜湊回歸一致
- README：功能／結構／統計表（實算）／JSON 格式（id、kind、選項圖清單）／新增轉檔節；刪過時「46 題待補」

## 2026-09-23 — 網頁 Part B（8 項）
- 已答數、全部解析開關、回頂端、重練錯題、作答紀錄（上次／最佳）、草稿續答（含秒數）、鍵盤（↑↓／A–D／Enter）、倒數提醒（只提醒不自動交卷）、即時回饋（選完鎖定）

## 2026-09-23 — 網頁 Part A＋11 章重建
- 出題數自訂（是非／選擇各 0–40）；11 章解析卷全重跑：2014 題；`index.html` 支援選項圖清單、`kind`、`{圖N}` 標記；u0306 入 CHAPTERS

## 2026-09-23 — 轉檔器演進
- `--png`、`images.options` 改清單、`id`／`kind` 欄位、移除 CSV、預設輸出 `questions/{prefix}.json`
- 後設資料剝離（難易度／知識向度／出處）、答案 NFKC 正規化＋剝括號、EMF 保留原格式
