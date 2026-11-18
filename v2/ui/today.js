import { fmtDate } from './dom.js';

export function renderToday(ctx) {
  const { p, lang, cap, text, build } = ctx;
  const mastered = Object.values(p.words).filter((s) => (s.b || 0) >= 4).length;
  const todayCnt = p.days[ctx.today] || 0;
  const langName = lang === 'en' ? '英语' : '日语';
  const seed = ctx.seed;

  return `
  <header class="top">
    <div class="brand">
      <span class="logo">🌎</span>
      <div>
        <h1>英语星球 <em>v2</em></h1>
        <p class="sub">${langName} · Lv.${cap} · ${mastered} 词已掌握</p>
      </div>
    </div>
    <button class="icon-btn" data-action="settings" aria-label="设置">⚙️</button>
  </header>

  <section class="streak">
    <div><b>${p.streak || 0}</b><span>连续天数</span></div>
    <div><b>${todayCnt}</b><span>今日题数</span></div>
    <div><b>${p.runs || 0}</b><span>总副本</span></div>
  </section>

  <section class="card run-card">
    <div class="run-head">
      <div>
        <p class="tag">今日副本 · ${fmtDate()}</p>
        <h2>遗忘之喉</h2>
        <p class="muted">种子 ${seed.slice(5, 10)} · 11 个节点 · 约 20 分钟</p>
      </div>
      <div class="orb">👁️</div>
    </div>
    <button class="primary wide" data-action="start-run">进入副本</button>
  </section>

  ${
    text
      ? `<section class="card read-card">
    <p class="tag">今日一段 · ${text.level.toUpperCase()} · 约 2 分钟</p>
    <h3>${text.title}</h3>
    <p class="muted clamp">${text.body.split('\n')[0].slice(0, 64)}…</p>
    <button class="ghost wide" data-action="read" data-id="${text.id}">读这一段</button>
  </section>`
      : ''
  }

  <section class="card">
    <div class="row between">
      <p class="tag">掌握进度</p>
      <p class="muted">${mastered} / ${cap * 200} 解锁 Lv.${Math.min(5, cap + 1)}</p>
    </div>
    <div class="bar"><i style="width:${Math.min(100, (mastered / (cap * 200)) * 100)}%"></i></div>
    <p class="muted small">每掌握 200 个词，解锁下一级词库。已掌握 = 连续答对 4 次以上。</p>
  </section>

  <p class="build">build ${build}</p>
  `;
}
