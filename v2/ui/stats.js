import { fmtDate } from './dom.js';

export function renderStats(ctx) {
  const { p, lang } = ctx;
  const words = Object.values(p.words);
  const buckets = [0, 0, 0, 0, 0, 0];
  for (const s of words) buckets[Math.min(5, s.b || 0)]++;
  const max = Math.max(1, ...buckets);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ k, n: p.days[k] || 0, label: '日一二三四五六'[d.getDay()] });
  }
  const dmax = Math.max(1, ...days.map((d) => d.n));

  return `
  <header class="top">
    <div class="brand"><span class="logo">📊</span><div><h1>记录</h1><p class="sub">${lang === 'en' ? '英语' : '日语'} · 数据只存在本机</p></div></div>
  </header>

  <section class="stats-grid">
    <div><b>${words.length}</b><span>学过的词</span></div>
    <div><b>${buckets[4] + buckets[5]}</b><span>已掌握</span></div>
    <div><b>${p.streak || 0}</b><span>连续天数</span></div>
    <div><b>${p.runs || 0}</b><span>副本数</span></div>
  </section>

  <section class="card">
    <p class="tag">最近 7 天</p>
    <div class="week">
      ${days
        .map(
          (d) => `<div class="wd"><i style="height:${Math.max(4, (d.n / dmax) * 72)}px"></i><span>${d.label}</span><em>${d.n || ''}</em></div>`
        )
        .join('')}
    </div>
  </section>

  <section class="card">
    <p class="tag">记忆分布</p>
    <div class="dist">
      ${buckets
        .map(
          (n, i) => `<div class="drow"><span>${i === 0 ? '新学' : '第 ' + i + ' 档'}</span>
          <div class="bar"><i style="width:${(n / max) * 100}%"></i></div><b>${n}</b></div>`
        )
        .join('')}
    </div>
    <p class="muted small">每答对一次升一档，最高第 5 档。第 4 档以上算「已掌握」。</p>
  </section>

  <section class="card">
    <p class="tag">最近对局</p>
    <p class="muted small">${p.lastRun ? '上一局：' + p.lastRun : '还没有打过副本'}</p>
  </section>
  `;
}
