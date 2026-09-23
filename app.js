const MAX_COUNT = 40;
// 出題設定：是非／選擇各 0–40（0 為不考）；timed=倒數提醒（只提醒不自動交卷）；instant=即時回饋（選完鎖定）
let settings = { tf: 10, mc: 10, timed: false, minutes: 20, instant: false };
const STORE_SET = 'quiz_settings', STORE_REC = 'quiz_records', STORE_DRAFT = 'quiz_draft';
const IMG_DIR = 'images/';

let allChapters = {}, selectedChapter = null, quizList = [], userAnswers = {};
let activePage = 'homePage';
let timerLeft = 0, timerId = null, timedOut = false;
let kbIndex = 0, showAllExpl = false;
let cardEls = [], optsEls = {}; // renderQuiz 產生的卡片／選項容器（kb 高亮與狀態重繪用）

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function normKey(k) {
  return String(k||'').trim()
    .replace(/[(（]/g,'')
    .replace(/[)）]/g,'')
    .replace(/[Ａ-Ｚ]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248));
}

// ---------- 設定／紀錄／草稿（localStorage） ----------
function storeGet(k) {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; }
}
function storeSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
}
function storeDel(k) {
  try { localStorage.removeItem(k); } catch (e) {}
}

function loadSettings() {
  const s = storeGet(STORE_SET);
  if (!s) return;
  if (Number.isFinite(+s.tf)) settings.tf = Math.max(0, Math.min(MAX_COUNT, s.tf | 0));
  if (Number.isFinite(+s.mc)) settings.mc = Math.max(0, Math.min(MAX_COUNT, s.mc | 0));
  settings.timed = !!s.timed;
  if (Number.isFinite(+s.minutes)) settings.minutes = Math.max(1, Math.min(99, s.minutes | 0));
  settings.instant = !!s.instant;
}
function saveSettings() {
  storeSet(STORE_SET, { tf: settings.tf, mc: settings.mc, timed: settings.timed, minutes: settings.minutes, instant: settings.instant });
}

function readRecords() {
  const r = storeGet(STORE_REC);
  return (r && typeof r === 'object') ? r : {};
}
function saveRecord(chapter, correct, total) {
  const recs = readRecords();
  const arr = recs[chapter] || [];
  arr.push({ date: new Date().toLocaleString('zh-TW', { hour12: false }), correct, total, pct: total ? Math.round(correct / total * 100) : 0 });
  recs[chapter] = arr.slice(-10);
  storeSet(STORE_REC, recs);
}
function clearRecords() {
  if (!confirm('確定清除所有作答紀錄嗎？')) return;
  storeDel(STORE_REC);
  renderHome();
}

function snapshotSettings() {
  return { tf: settings.tf, mc: settings.mc, timed: settings.timed, minutes: settings.minutes, instant: settings.instant };
}
function saveDraft() {
  if (!quizList.length) return;
  storeSet(STORE_DRAFT, { chapter: selectedChapter, settings: snapshotSettings(), quizList, userAnswers, timerLeft });
}
function readDraft() {
  return storeGet(STORE_DRAFT);
}
function clearDraft() {
  storeDel(STORE_DRAFT);
}
// 圖片載入失敗備援：隱藏破圖＋console 警告（方便抓漏）
function imgFail(el) {
  console.warn('[img-missing]', el.getAttribute('src'));
  el.classList.add('img-broken');
}

// 沒有標記、或標記對不到的圖片，維持原本「整批貼在題目下方」的樣子，向下相容舊格式的 JSON。
function renderStem(q) {
  const stems = (q.images && q.images.stem) || [];
  const used = new Set();
  const textHtml = String(q.text || '').replace(/\{圖(\d+)\}/g, (whole, n) => {
    const idx = parseInt(n, 10) - 1;
    const f = stems[idx];
    if (!f) return whole; // 標記對不到圖片就原樣保留，不要憑空消失
    used.add(idx);
    return `<img class="inline-img" src="${IMG_DIR}${f}" alt="題目圖片" loading="lazy" onerror="imgFail(this)">`;
  });
  const leftover = stems.filter((_, i) => !used.has(i));
  const stemImgHTML = leftover.length
    ? `<div class="q-img">${leftover.map(f => `<img src="${IMG_DIR}${f}" alt="題目圖片" loading="lazy" onerror="imgFail(this)">`).join('')}</div>`
    : '';
  return { textHtml, stemImgHTML };
}

// 選項圖支援「單一檔名」與「檔名清單」兩種格式（新版 JSON 一個選項可有多張圖）
function optImgList(q, key) {
  const v = (q.images && q.images.options) ? q.images.options[key] : null;
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function remapOptions(q) {
  const items = q.options.map(o => {
    const imgs = optImgList(q, o.key);
    // kind：新版 JSON 自帶；舊格式回退計算（無文字且有圖 ⇒ image）
    const kind = o.kind || ((!String(o.text || '').trim() && imgs.length) ? 'image' : 'text');
    return { text: o.text, kind, imgs, isAnswer: o.key === q.answer };
  });
  const shuffled = shuffle(items);
  const keys = ['A','B','C','D'];
  const newOpts = shuffled.map((it,i) => ({ key: keys[i], text: it.text, kind: it.kind }));
  const optImgs = {};
  shuffled.forEach((it,i) => { if (it.imgs.length) optImgs[keys[i]] = it.imgs; });
  const newAnswer = keys[shuffled.findIndex(it => it.isAnswer)];
  const images = q.images ? Object.assign({}, q.images, {options: optImgs}) : undefined;
  return Object.assign({}, q, {options: newOpts, answer: newAnswer, images});
}

let CHAPTERS = []; // chapters.json 載入（name/file/tf/mc）；題庫本體選章開考前才抓

async function loadChapters() {
  try {
    const r = await fetch('chapters.json', {cache:'no-store'});
    if (!r.ok) throw 0;
    CHAPTERS = await r.json();
  } catch (e) {
    document.getElementById('loadingMsg').style.display = 'none';
    showError('找不到章節清單（chapters.json），請確認已部署。');
    return;
  }
  document.getElementById('loadingMsg').style.display = 'none';
  renderHome();
  document.getElementById('unitSection').style.display = 'block';
}

// 題庫本體 lazy-load：開考前才抓一次，抓過就快取在 allChapters
async function ensureChapter(name) {
  if (allChapters[name]) return true;
  const meta = CHAPTERS.find(c => c.name === name);
  if (!meta) return false;
  try {
    const r = await fetch('questions/' + meta.file, {cache:'no-store'});
    if (!r.ok) throw 0;
    const data = await r.json();
    allChapters[name] = data.questions;
    return true;
  } catch (e) {
    showError(`章節「${name}」載入失敗，請檢查 questions/${meta.file} 是否存在。`);
    return false;
  }
}

function renderHome() {
  const list = document.getElementById('unitList');
  list.innerHTML = '';
  CHAPTERS.forEach(c => {
    const recs = readRecords()[c.name] || [];
    const recHTML = recs.length
      ? `<div class="unit-record">上次 ${recs[recs.length-1].pct}% · 最佳 ${Math.max(...recs.map(r=>r.pct))}%</div>`
      : '';
    const item = document.createElement('div');
    item.className = 'unit-item';
    item.innerHTML = `
      <div class="unit-radio"><div class="unit-dot"></div></div>
      <div style="flex:1">
        <div class="unit-name">${c.name}</div>
        <div class="unit-meta">
          <span class="unit-badge badge-tf">是非 ${c.tf | 0}</span>
          <span class="unit-badge badge-mc">選擇 ${c.mc | 0}</span>
        </div>
        ${recHTML}
      </div>`;
    item.onclick = () => {
      document.querySelectorAll('.unit-item').forEach(i=>i.classList.remove('selected'));
      item.classList.add('selected');
      selectedChapter = c.name;
      updateSettingsUI(); // 依該章實際題數夾回上限、刷新開始鈕
    };
    list.appendChild(item);
  });
  updateSettingsUI(); // 初始狀態：開始鈕顯示「請先選擇章節」
  renderDraftBox();
}

function renderDraftBox() {
  const box = document.getElementById('draftBox');
  if (!box) return;
  const d = readDraft();
  const ok = d && d.quizList && d.quizList.length && CHAPTERS.some(c => c.name === d.chapter);
  if (!ok) { box.style.display = 'none'; return; }
  const done = Object.keys(d.userAnswers || {}).length;
  document.getElementById('draftText').textContent =
    `上次「${d.chapter}」沒做完（已答 ${done}／共 ${d.quizList.length} 題）`;
  box.style.display = '';
}
function discardDraft() {
  clearDraft();
  renderDraftBox();
}

// ---------- 出題設定（是非／選擇各 0–40，0 為不考） ----------
function poolStats() {
  if (!selectedChapter) return { tf: 0, mc: 0 };
  if (allChapters[selectedChapter]) {
    const pool = allChapters[selectedChapter];
    const valid = q => q.answer && q.options.length > 0;
    return {
      tf: pool.filter(q => q.type === '是非' && valid(q)).length,
      mc: pool.filter(q => q.type === '選擇' && valid(q)).length,
    };
  }
  // 題庫本體尚未載入：用 chapters.json 的計數（驗證綠燈時與 valid() 一致）
  const meta = CHAPTERS.find(c => c.name === selectedChapter);
  return meta ? { tf: meta.tf | 0, mc: meta.mc | 0 } : { tf: 0, mc: 0 };
}

function clampSettings() {
  const stat = poolStats();
  // 未選章：只限 0–40；選章後：上限再取 min(40, 該章可用題數)
  const capTf = selectedChapter ? Math.min(MAX_COUNT, stat.tf) : MAX_COUNT;
  const capMc = selectedChapter ? Math.min(MAX_COUNT, stat.mc) : MAX_COUNT;
  settings.tf = Math.max(0, Math.min(capTf, settings.tf | 0));
  settings.mc = Math.max(0, Math.min(capMc, settings.mc | 0));
  return { stat, capTf, capMc };
}

function updateSettingsUI() {
  const { stat, capTf, capMc } = clampSettings();
  const tfInput = document.getElementById('tfNum');
  const mcInput = document.getElementById('mcNum');
  if (tfInput) { tfInput.value = settings.tf; tfInput.max = capTf; }
  if (mcInput) { mcInput.value = settings.mc; mcInput.max = capMc; }
  document.getElementById('chipTF').textContent = '● 是非題 ×' + settings.tf;
  document.getElementById('chipMC').textContent = '● 選擇題 ×' + settings.mc;
  document.getElementById('tfMax').textContent = '庫存 ' + (selectedChapter ? stat.tf + ' 題' : '—');
  document.getElementById('mcMax').textContent = '庫存 ' + (selectedChapter ? stat.mc + ' 題' : '—');
  const timedChk = document.getElementById('timedChk');
  const instantChk = document.getElementById('instantChk');
  const minWrap = document.getElementById('minWrap');
  const minNum = document.getElementById('minNum');
  if (timedChk) timedChk.checked = settings.timed;
  if (instantChk) instantChk.checked = settings.instant;
  if (minWrap) minWrap.style.display = settings.timed ? '' : 'none';
  if (minNum) minNum.value = settings.minutes;
  updateStartBtn();
}

function updateStartBtn() {
  const btn = document.getElementById('startBtn');
  const total = settings.tf + settings.mc;
  if (!selectedChapter) {
    btn.disabled = true;
    btn.textContent = '請先選擇章節';
  } else if (total === 0) {
    btn.disabled = true;
    btn.textContent = '請至少選擇一種題型';
  } else {
    btn.disabled = false;
    btn.textContent = `開始練習（共 ${total} 題） →`;
  }
}

function stepCount(kind, delta) {
  const { capTf, capMc } = clampSettings();
  const cap = kind === 'tf' ? capTf : capMc;
  settings[kind] = Math.max(0, Math.min(cap, (settings[kind] | 0) + delta));
  saveSettings();
  updateSettingsUI();
}

function inputCount(kind) {
  const el = document.getElementById(kind === 'tf' ? 'tfNum' : 'mcNum');
  let v = parseInt(el.value, 10);
  if (isNaN(v)) v = 0;
  const { capTf, capMc } = clampSettings();
  const cap = kind === 'tf' ? capTf : capMc;
  settings[kind] = Math.max(0, Math.min(cap, v));
  saveSettings();
  updateSettingsUI();
}

function toggleTimed() {
  settings.timed = !!document.getElementById('timedChk').checked;
  saveSettings();
  updateSettingsUI();
}
function toggleInstant() {
  settings.instant = !!document.getElementById('instantChk').checked;
  saveSettings();
  updateSettingsUI();
}
function inputMinutes() {
  const el = document.getElementById('minNum');
  let v = parseInt(el.value, 10);
  if (isNaN(v)) v = 1;
  settings.minutes = Math.max(1, Math.min(99, v));
  el.value = settings.minutes;
  saveSettings();
}

async function startQuiz() {
  if (!selectedChapter) return;
  if (settings.tf + settings.mc === 0) return;
  const btn = document.getElementById('startBtn');
  btn.disabled = true;
  btn.textContent = '載入題庫中…';
  const okLoad = await ensureChapter(selectedChapter);
  updateSettingsUI(); // 用實際資料重新夾上限、還原按鈕
  if (!okLoad) return;
  const pool = allChapters[selectedChapter];
  const valid = q => q.answer && q.options.length > 0;
  const tf = shuffle(pool.filter(q=>q.type==='是非'&&valid(q))).slice(0,settings.tf);
  const mc = shuffle(pool.filter(q=>q.type==='選擇'&&valid(q))).slice(0,settings.mc);
  quizList = [...tf,...mc].map(q => {
    const r = q.type==='選擇' ? remapOptions(q) : Object.assign({}, q, {options:[...q.options]});
    r.locked = false;
    return r;
  });
  userAnswers = {};
  kbIndex = 0;
  timedOut = false;
  document.getElementById('quizChapter').textContent = selectedChapter;
  document.getElementById('timeWarn').style.display = 'none';
  startTimer();
  renderQuiz();
  saveDraft();
  showPage('quizPage');
}

// ---------- 倒數提醒（歸零只提醒、不自動交卷） ----------
function fmtTime(s) {
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `⏱ ${mm}:${ss}`;
}
function renderTimer() {
  const disp = document.getElementById('timerDisp');
  if (!settings.timed) return;
  disp.textContent = fmtTime(timerLeft);
}
function markTimeout() {
  document.getElementById('timerDisp').classList.add('timer-warn');
  document.getElementById('timeWarn').style.display = '';
}
function startTimer() {
  stopTimer();
  const disp = document.getElementById('timerDisp');
  disp.classList.remove('timer-warn');
  if (!settings.timed) { disp.style.display = 'none'; timerLeft = 0; return; }
  timerLeft = settings.minutes * 60;
  timedOut = false;
  disp.style.display = '';
  renderTimer();
  timerId = setInterval(tick, 1000);
}
function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}
function tick() {
  if (timerLeft > 0) timerLeft--;
  if (timerLeft <= 0) {
    stopTimer();
    timedOut = true;
    markTimeout(); // 只提醒，不自動交卷
  }
  renderTimer();
  saveDraft();
}

function renderQuiz() {
  const container = document.getElementById('questionsList');
  container.innerHTML = '';
  document.getElementById('progressBar').style.width = '0%';
  cardEls = [];
  optsEls = {};

  quizList.forEach((q, idx) => {
    const isTF = q.type==='是非';
    const card = document.createElement('div');
    card.className = 'q-card';
    card.id = 'qcard-' + idx;

    const { textHtml, stemImgHTML } = renderStem(q);

    card.innerHTML = `
      <div class="q-head">
        <span class="q-num">Q${idx+1}</span>
        <span class="q-tag ${isTF?'tag-tf':'tag-mc'}">${isTF?'是非題':'選擇題'}</span>
      </div>
      <div class="q-text">${textHtml}</div>
      ${stemImgHTML}`;

    const optsEl = document.createElement('div');
    optsEl.className = 'options' + (isTF ? ' opts-tf' : '');
    optsEl.id = 'opts-' + idx;
    card.appendChild(optsEl);
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt' + (opt.kind === 'image' ? ' image-opt' : '');
      btn.setAttribute('data-key', opt.key);
      btn.setAttribute('aria-pressed', 'false');
      const optImgHTML = optImgList(q, opt.key).map(f =>
        `<div class="opt-img"><img src="${IMG_DIR}${f}" alt="選項圖" loading="lazy" onerror="imgFail(this)"></div>`).join('');
      btn.innerHTML = `
        <div class="opt-key">${opt.key}</div>
        <div class="opt-body">
          ${opt.text ? `<div class="opt-text">${opt.text}</div>` : ''}
          ${optImgHTML}
        </div>`;
      btn.onclick = () => answerQuestion(idx, opt.key);
      optsEl.appendChild(btn);
    });
    container.appendChild(card);
    cardEls.push(card);
    optsEls[idx] = optsEl;
    paintOpts(idx); // 還原已作答／鎖定狀態（草稿續答用）
  });
  updateProgress();
  markKb(false);
}

// 點擊／鍵盤共用：作答 → 高亮 →（即時模式）鎖定並標對錯 → 進度＋存草稿
function answerQuestion(idx, key) {
  const q = quizList[idx];
  if (!q || q.locked) return;
  userAnswers[idx] = key;
  kbIndex = idx;
  if (settings.instant) q.locked = true; // 即時回饋：選完即鎖定，不可改
  paintOpts(idx);
  updateProgress();
  saveDraft();
  markKb(false);
}

// 依目前答案＋鎖定狀態重繪某題的選項樣式
function paintOpts(idx) {
  const q = quizList[idx];
  const optsEl = optsEls[idx];
  if (!q || !optsEl) return;
  const chosen = userAnswers[idx];
  optsEl.querySelectorAll('.opt').forEach(o => {
    const k = o.getAttribute('data-key');
    const isChosen = normKey(k) === normKey(chosen);
    o.classList.remove('chosen', 'correct', 'wrong');
    if (isChosen) o.classList.add('chosen');
    o.setAttribute('aria-pressed', isChosen ? 'true' : 'false');
    if (settings.instant && chosen !== undefined) {
      o.classList.add('locked');
      if (normKey(k) === normKey(q.answer)) o.classList.add('correct');
      else if (normKey(k) === normKey(chosen)) o.classList.add('wrong');
    }
  });
}

function markKb(scroll) {
  cardEls.forEach(c => c.classList.remove('kb-active'));
  const card = cardEls[kbIndex];
  if (!card) return;
  card.classList.add('kb-active');
  if (scroll && typeof card.scrollIntoView === 'function') {
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function updateCountLabel() {
  const n = Object.keys(userAnswers).length;
  document.getElementById('quizCount').textContent = `共 ${quizList.length} 題 · 已答 ${n}`;
}

function updateProgress() {
  const pct = quizList.length ? (Object.keys(userAnswers).length / quizList.length * 100).toFixed(0) : 0;
  document.getElementById('progressBar').style.width = pct+'%';
  updateCountLabel();
}

function submitQuiz() {
  const unanswered = quizList.length - Object.keys(userAnswers).length;
  if (unanswered > 0 && !confirm(`還有 ${unanswered} 題未作答，確定交卷嗎？`)) return;
  stopTimer();
  clearDraft();
  showResult();
}

function wrongList() {
  return quizList
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => normKey(userAnswers[i]) !== normKey(q.answer));
}

// 只重練答錯的題（含未答）：重組＋重洗選擇題，重置狀態直接開考
function retryWrong() {
  const wrong = wrongList();
  if (!wrong.length) return;
  quizList = wrong.map(({ q }) => {
    const r = q.type === '選擇'
      ? remapOptions(Object.assign({}, q))
      : Object.assign({}, q, { options: [...q.options] });
    r.locked = false;
    return r;
  });
  userAnswers = {};
  kbIndex = 0;
  timedOut = false;
  document.getElementById('timeWarn').style.display = 'none';
  startTimer();
  renderQuiz();
  saveDraft();
  showPage('quizPage');
}

function showResult() {
  showPage('resultPage');
  let correct = 0;
  quizList.forEach((q,i) => { if (normKey(userAnswers[i])===normKey(q.answer)) correct++; });
  saveRecord(selectedChapter, correct, quizList.length);

  const total = quizList.length;
  const pct = total ? Math.round(correct/total*100) : 0;
  document.getElementById('ringPct').textContent = pct+'%';
  const circ = 2*Math.PI*43;
  setTimeout(() => {
    const prog = document.getElementById('ringProg');
    prog.style.strokeDasharray = circ;
    prog.style.strokeDashoffset = circ*(1-pct/100);
  }, 100);

  document.getElementById('resGrade').textContent =
    pct>=90?'🎉 太厲害了！':pct>=70?'👍 表現不錯！':pct>=60?'💪 繼續加油！':'📖 再多複習一下！';
  document.getElementById('resDetail').textContent = `共 ${total} 題，答對 ${correct} 題`;

  showAllExpl = false;
  document.getElementById('expToggle').textContent = '顯示全部解析';
  renderReview();

  const wrongN = total - correct;
  const rb = document.getElementById('retryBtn');
  rb.style.display = wrongN ? '' : 'none';
  rb.textContent = `重練錯題（${wrongN} 題）`;
}

function toggleExpl() {
  showAllExpl = !showAllExpl;
  document.getElementById('expToggle').textContent = showAllExpl ? '只顯示錯題解析' : '顯示全部解析';
  renderReview();
}

function renderReview() {
  document.getElementById('reviewList').innerHTML = quizList.map((q,i)=>{
    const chosen = userAnswers[i];
    const isCorrect = normKey(chosen)===normKey(q.answer);
    const chosenOpt = q.options.find(o=>normKey(o.key)===normKey(chosen));
    const correctOpt = q.options.find(o=>normKey(o.key)===normKey(q.answer));
    const isTF = q.type==='是非';

    const { textHtml, stemImgHTML } = renderStem(q);

    const optsHTML = q.options.map(o => {
      const key = normKey(o.key);
      const isCor = key===normKey(q.answer);
      const isChosen = key===normKey(chosen);
      let cls = 'opt locked';
      if (isCor) cls += ' correct';
      if (isChosen && !isCor) cls += ' wrong';
      if (o.kind === 'image') cls += ' image-opt';
      const optImgHTML = optImgList(q, o.key).map(f =>
        `<div class="opt-img"><img src="${IMG_DIR}${f}" alt="選項圖" loading="lazy" onerror="imgFail(this)"></div>`).join('');
      return `
        <div class="${cls}">
          <div class="opt-key">${o.key}</div>
          <div class="opt-body">
            ${o.text ? `<div class="opt-text">${o.text}</div>` : ''}
            ${optImgHTML}
          </div>
        </div>`;
    }).join('');

    const wrongPart = (!isCorrect&&chosen)
      ? `<span class="ans-wrong">你的答案：${normKey(chosen)}. ${chosenOpt?.text||''}</span>` : '';
    const skippedPart = !chosen ? `<span class="ans-wrong">未作答</span>` : '';
    const correctPart = isCorrect
      ? `<span class="ans-correct">✓ ${normKey(q.answer)}. ${correctOpt?.text||''}</span>`
      : `<span class="ans-correct">正確：${normKey(q.answer)}. ${correctOpt?.text||''}</span>`;
    const expPart = (q.explanation && (showAllExpl || !isCorrect))
      ? `<div class="ri-exp">📌 ${q.explanation}</div>` : '';
    return `
      <div class="review-item">
        <div class="ri-head">
          <span class="ri-badge ${isCorrect?'badge-correct':'badge-wrong'}">${isCorrect?'答對':'答錯'}</span>
          <div class="ri-text">Q${i+1}. ${textHtml}</div>
        </div>
        ${stemImgHTML}
        <div class="options ${isTF?'opts-tf':''}">${optsHTML}</div>
        <div class="ri-ans">${wrongPart}${skippedPart}${correctPart}</div>
        ${expPart}
      </div>`;
  }).join('');
}

function continueDraft() {
  const d = readDraft();
  if (!d || !d.quizList || !d.quizList.length || !allChapters[d.chapter]) return;
  selectedChapter = d.chapter;
  const s = d.settings || {};
  settings = {
    tf: s.tf | 0, mc: s.mc | 0,
    timed: !!s.timed, minutes: s.minutes | 0 || 20, instant: !!s.instant,
  };
  quizList = d.quizList;
  userAnswers = d.userAnswers || {};
  kbIndex = 0;
  timedOut = false;
  document.getElementById('quizChapter').textContent = selectedChapter;
  document.getElementById('timeWarn').style.display = 'none';
  timerLeft = d.timerLeft | 0;
  const disp = document.getElementById('timerDisp');
  disp.classList.remove('timer-warn');
  stopTimer();
  if (settings.timed && timerLeft > 0) {
    disp.style.display = '';
    renderTimer();
    timerId = setInterval(tick, 1000); // 續答：從剩餘秒數繼續倒數
  } else {
    disp.style.display = settings.timed ? '' : 'none';
    if (settings.timed && timerLeft <= 0) { timedOut = true; markTimeout(); }
  }
  renderQuiz();
  showPage('quizPage');
}

// ---------- 鍵盤操作（僅測驗頁）：↑↓換題、A–D作答、Enter交卷 ----------
document.addEventListener('keydown', (e) => {
  if (activePage !== 'quizPage' || !quizList.length) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    kbIndex = Math.min(quizList.length - 1, kbIndex + 1);
    markKb(true);
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    kbIndex = Math.max(0, kbIndex - 1);
    markKb(true);
  } else if (/^[a-dA-D]$/.test(e.key)) {
    answerQuestion(kbIndex, e.key.toUpperCase());
  } else if (e.key === 'Enter') {
    e.preventDefault();
    submitQuiz();
  }
});

// ---------- 回頂端 ----------
function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.addEventListener('scroll', () => {
  const b = document.getElementById('topBtn');
  if (b) b.style.display = (window.scrollY > 400) ? '' : 'none';
}, { passive: true });

// 測驗中離開頁面先存草稿
window.addEventListener('beforeunload', () => {
  if (activePage === 'quizPage') saveDraft();
});

function showPage(id) {
  activePage = id;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}
function backHome() {
  stopTimer();
  showPage('homePage');
  updateSettingsUI();
  renderDraftBox();
}
function showError(msg) {
  const el = document.getElementById('errorBox');
  el.style.display='block'; el.textContent=msg;
}

loadSettings();
loadChapters();

// PWA：http(s) 下註冊 service worker（file:// 略過；測試 stub 無 navigator/location 也略過）
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    && typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
