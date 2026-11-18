import { state, langProgress, save, setLang, migrateV1, levelCap, markDay } from './core/state.js';
import { loadPool, loadTexts } from './core/data.js';
import { todayKey } from './core/rng.js';
import { Run } from './games/run.js';
import { renderToday } from './ui/today.js';
import { renderBattle, renderEvent, renderChest, renderRest, renderDropToast, escapeHTML } from './ui/dungeon.js';
import { renderResult } from './ui/result.js';
import { renderStats } from './ui/stats.js';
import { renderSettings } from './ui/settings.js';
import { renderReading } from './ui/reading.js';
import { $, toast, vibrate } from './ui/dom.js';
import { BUILD, VERSION } from './cfg.js';

/* ---------- 故障可视化：任何未捕获错误直接显示在屏幕上，不再静默白屏 ---------- */
function showFatal(msg) {
  let box = document.getElementById('fatal');
  if (!box) {
    box = document.createElement('div');
    box.id = 'fatal';
    box.style.cssText =
      'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#3a0d18;color:#ffd7de;' +
      'border:1px solid #ff5470;border-radius:12px;padding:10px 12px;font-size:12px;line-height:1.5;' +
      'max-height:44vh;overflow:auto;white-space:pre-wrap;word-break:break-word';
    document.body.appendChild(box);
  }
  box.textContent = '出错了：' + msg + '\n\nbuild ' + BUILD;
}
window.addEventListener('error', (e) => showFatal(e.message || 'script error'));
window.addEventListener('unhandledrejection', (e) => showFatal((e.reason && e.reason.message) || String(e.reason)));

/* ---------- ?reset=1：注销 SW、清空缓存后重载（修“改了没生效/页面卡死”用） ---------- */
if (new URLSearchParams(location.search).has('reset')) {
  (async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch (e) {}
    location.replace(location.pathname);
  })();
}

const app = {
  view: 'today',
  tab: 'today',
  run: null,
  nodeView: null,
  text: null,
  showZh: false,
  answered: null,
  pool: [],
  texts: [],
  build: BUILD,
  practice: false,
};

const p = () => langProgress(state.lang);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 启动 ---------- */

async function boot() {
  render('<div class="loading">加载词库…</div>');
  try {
    app.pool = await loadPool(state.lang, levelCap(p()));
    app.texts = await loadTexts(state.lang);
    const m = migrateV1(app.pool);
    if (m && (m.en || m.ja)) toast(`已迁移旧进度：英语 ${m.en} 词，日语 ${m.ja} 词`, 2600);
  } catch (e) {
    console.error(e);
    render('<div class="loading">词库加载失败，请检查网络后重试</div>');
    return;
  }
  renderTodayView();
  registerSW();
  if (new URLSearchParams(location.search).has('debug')) startDebug();

  // 开发用：?autostart=1 直接进副本，方便截图与手测
  const qs = new URLSearchParams(location.search);
  if (qs.has('lang') && qs.get('lang') !== state.lang) {
    state.lang = qs.get('lang') === 'ja' ? 'ja' : 'en';
    app.pool = await loadPool(state.lang, levelCap(p()));
    app.texts = await loadTexts(state.lang);
    return renderTodayView();
  }
  if (qs.get('tab') === 'settings') return renderSettingsView();
  if (qs.has('read')) return openReading((app.texts[0] || {}).id);
  if (qs.has('devresult')) {
    startRun();
    app.run.hp = 0;
    return finishRun();
  }
  if (qs.has('autostart')) {
    startRun();
    const skip = Number(qs.get('skip') || 0);
    for (let i = 0; i < skip && app.run && !app.run.finished; i++) app.run.advance();
    if (app.run && !app.run.finished) enterNode();
  }
}

async function switchLang(lang) {
  if (state.lang === lang) return;
  setLang(lang);
  toast(lang === 'en' ? '切换到英语' : '切换到日语');
  app.run = null;
  await boot();
}

/* ---------- 渲染 ---------- */

function render(html) {
  $('#app').innerHTML = html;
}

function shell(inner) {
  const tab = app.tab;
  return `
    <main class="page">${inner}</main>
    <nav class="tabbar">
      <button data-action="tab" data-tab="today" class="${tab === 'today' ? 'on' : ''}">🏠<span>今天</span></button>
      <button data-action="tab" data-tab="stats" class="${tab === 'stats' ? 'on' : ''}">📊<span>记录</span></button>
      <button data-action="tab" data-tab="settings" class="${tab === 'settings' ? 'on' : ''}">⚙️<span>设置</span></button>
    </nav>`;
}

function renderTodayView() {
  app.view = 'today';
  app.tab = 'today';
  const seed = `${todayKey()}:${state.lang}`;
  const next = pickText();
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    week.push({ k, n: p().days[k] || 0, label: '日一二三四五六'[d.getDay()], today: k === todayKey() });
  }
  render(
    shell(
      renderToday({
        p: p(),
        lang: state.lang,
        cap: levelCap(p()),
        today: todayKey(),
        seed,
        text: next,
        week,
        build: VERSION,
      })
    )
  );
}

function renderStatsView() {
  app.view = 'stats';
  app.tab = 'stats';
  render(shell(renderStats({ p: p(), lang: state.lang })));
}

function renderSettingsView() {
  app.view = 'settings';
  app.tab = 'settings';
  render(shell(renderSettings({ state, p: p(), build: VERSION })));
}

function pickText() {
  if (!app.texts.length) return null;
  const rngSeed = `${todayKey()}:${state.lang}:text`;
  let h = 0;
  for (const c of rngSeed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return app.texts[h % app.texts.length];
}

function renderNode() {
  const run = app.run;
  const v = app.nodeView;
  if (!v) return;
  if (v.kind === 'battle') render(renderBattle({ run, node: v.node }));
  else if (v.kind === 'event') render(renderEvent({ run, node: v.node, ev: v.event }));
  else if (v.kind === 'chest') render(renderChest({ run, node: v.node, choices: v.choices }));
  else if (v.kind === 'rest') render(renderRest({ run, node: v.node }));
}

/* ---------- 副本流程 ---------- */

function startRun(practice = false) {
  app.practice = practice;
  const run = new Run({
    seed: `${todayKey()}`,
    lang: state.lang,
    pool: app.pool,
    words: p().words,
    hp: 100,
    dailyNew: state.settings.dailyNew,
    cap: levelCap(p()),
  });
  app.run = run;
  if (!practice) {
    p().runs = (p().runs || 0) + 1;
    save();
  }
  enterNode();
}

function enterNode() {
  const run = app.run;
  if (!run) return;
  const v = run.enter();
  if (v.kind === 'end') return finishRun();
  app.nodeView = v;
  app.view = 'dungeon';
  renderNode();
}

async function answer(i) {
  const run = app.run;
  if (!run || !run.battle || run.battle.over) return;
  const res = run.answer(i);
  if (!res) return;

  // 即时反馈：标选项、震动、飘伤害
  document.querySelectorAll('.opt').forEach((btn, idx) => {
    if (idx === res.correctIndex) btn.classList.add('ok');
    if (idx === i && !res.correct) btn.classList.add('no');
    btn.disabled = true;
  });
  vibrate(res.correct ? 10 : [18, 40, 18]);
  if (!res.correct) {
    const hpBar = document.querySelector('.dfoot .hp i');
    if (hpBar) hpBar.classList.add('shake');
  }
  markDay(p(), todayKey(), 1);
  saveSoon();

  await sleep(res.correct ? 420 : 760);
  if (run.finished) return finishRun();
  if (res.over && res.cleared) {
    toast(`${res.word} 击破`);
    app.nodeView = null;
    await sleep(200);
    run.advance();
    if (run.finished) return finishRun();
    enterNode();
    return;
  }
  renderNode();
}

async function choose(kind, payload) {
  const run = app.run;
  if (!run) return;
  const out = run.choose(kind, payload);
  toast(out.text, 2200);
  await sleep(600);
  if (run.hp <= 0) return finishRun();
  run.advance();
  if (run.finished) return finishRun();
  enterNode();
}

function finishRun() {
  const run = app.run;
  if (!run) return renderTodayView();
  if (!run.finished) {
    run.finished = true;
    run.win = run.hp > 0;
  }
  p().lastRun = `${todayKey()} ${run.win ? '通关' : '失败'} · ${run.nodes.filter((n) => n.cleared).length}/${run.nodes.length}`;
  if (!app.practice) {
    if (run.win) p().wins = (p().wins || 0) + 1;
    p().gold = (p().gold || 0) + run.gold;
    p().best = Math.max(p().best || 0, run.maxCombo);
    for (const d of run.drops) p().collection[d.key] = (p().collection[d.key] || 0) + 1;
  }
  save();
  app.view = 'result';
  render(renderResult({ result: run.result() }));
}

/* ---------- 阅读 ---------- */

function openReading(id) {
  const t = app.texts.find((x) => x.id === id) || app.texts[0];
  app.text = t;
  app.showZh = false;
  app.answered = null;
  app.view = 'reading';
  render(renderReading({ text: t, showZh: app.showZh, answered: app.answered }));
}

function toggleZh() {
  app.showZh = !app.showZh;
  render(renderReading({ text: app.text, showZh: app.showZh, answered: app.answered }));
}

function answerReading(i) {
  app.answered = i;
  vibrate(10);
  render(renderReading({ text: app.text, showZh: app.showZh, answered: app.answered }));
}

/* ---------- 存档 ---------- */

let saveTimer = null;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 900);
}


/* ---------- 语音 ---------- */

function speak(text) {
  if (!state.settings.tts || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = state.lang === 'en' ? 'en-US' : 'ja-JP';
  u.rate = 0.92;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/* ---------- 调试自检条（?debug=1） ---------- */
function startDebug() {
  const box = document.createElement('div');
  box.id = 'dbg';
  box.style.cssText =
    'position:sticky;top:0;z-index:9998;background:#12202b;color:#9fe3ff;border-bottom:1px solid #2b4a5e;' +
    'font:11px/1.5 ui-monospace,Menlo,monospace;padding:6px 10px;white-space:pre-wrap;word-break:break-all';
  document.body.prepend(box);
  let last = '-';
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    last = t ? t.dataset.action : '(无 data-action)';
  }, true);
  const tick = () => {
    const vv = window.visualViewport;
    box.textContent =
      `build ${BUILD}  vw ${innerWidth}×${innerHeight}  scroll ${document.documentElement.scrollWidth}×${document.documentElement.scrollHeight}\n` +
      `visual ${vv ? Math.round(vv.width) + '×' + Math.round(vv.height) + ' scale ' + vv.scale.toFixed(2) + ' off ' + Math.round(vv.offsetTop) : 'n/a'}  dpr ${devicePixelRatio}\n` +
      `最近点击: ${last}`;
  };
  tick();
  setInterval(tick, 500);
  window.addEventListener('resize', tick);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', tick);
}

/* ---------- PWA ---------- */

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker
    .register(`sw.js?v=${BUILD}`)
    .then((reg) => {
      // 回到前台时主动查一次新版本
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    })
    .catch((e) => console.warn('SW 注册失败', e));

  // 新版本接管后自动重载一次；首次安装不重载
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    toast('已更新到最新版', 900);
    setTimeout(() => location.reload(), 700);
  });
}

/* ---------- 事件 ---------- */

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const a = t.dataset.action;

  switch (a) {
    case 'tab':
      if (t.dataset.tab === 'today') renderTodayView();
      else if (t.dataset.tab === 'stats') renderStatsView();
      else renderSettingsView();
      break;
    case 'settings':
      renderSettingsView();
      break;
    case 'toggle-lang':
      switchLang(state.lang === 'en' ? 'ja' : 'en');
      break;
    case 'start-run':
      startRun(app.view === 'result');
      break;
    case 'answer':
      answer(Number(t.dataset.i));
      break;
    case 'speak':
      speak(t.dataset.w);
      break;
    case 'event':
      choose(t.dataset.eff, null);
      break;
    case 'chest':
      choose('take', t.dataset.key);
      break;
    case 'rest':
      choose(t.dataset.mode, null);
      break;
    case 'quit-run': {
      if (t.dataset.armed === '1') {
        app.run = null;
        renderTodayView();
        break;
      }
      t.dataset.armed = '1';
      t.textContent = '确认退出';
      t.classList.add('armed');
      setTimeout(() => {
        if (!t.isConnected) return;
        t.dataset.armed = '0';
        t.textContent = '✕';
        t.classList.remove('armed');
      }, 2600);
      break;
    }
    case 'back-today':
      app.run = null;
      renderTodayView();
      break;
    case 'read':
      openReading(t.dataset.id);
      break;
    case 'toggle-zh':
      toggleZh();
      break;
    case 'read-answer':
      answerReading(Number(t.dataset.i));
      break;
    case 'set-lang':
      switchLang(t.dataset.lang);
      break;
    case 'set-new':
      state.settings.dailyNew = Number(t.dataset.n);
      save();
      renderSettingsView();
      break;
    case 'toggle-tts':
      state.settings.tts = t.checked;
      save();
      break;
  }
});

// 快捷键：1-4 选项，空格继续
document.addEventListener('keydown', (e) => {
  if (app.view === 'dungeon') {
    const n = Number(e.key);
    if (n >= 1 && n <= 4) {
      const btns = document.querySelectorAll('.opt');
      if (btns[n - 1] && !btns[n - 1].disabled) btns[n - 1].click();
    }
  }
});

boot();
