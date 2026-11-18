export function renderSettings(ctx) {
  const { state, p, build } = ctx;
  const s = state.settings;
  return `
  <header class="top">
    <div class="brand"><span class="logo">⚙️</span><div><h1>设置</h1><p class="sub">v2 · build ${build}</p></div></div>
  </header>

  <section class="card">
    <p class="tag">语言</p>
    <div class="segs">
      <button class="seg ${state.lang === 'en' ? 'on' : ''}" data-action="set-lang" data-lang="en">🇬🇧 英语</button>
      <button class="seg ${state.lang === 'ja' ? 'on' : ''}" data-action="set-lang" data-lang="ja">⛩️ 日语</button>
    </div>
    <p class="muted small">两种语言的进度完全分开，随时可切。</p>
  </section>

  <section class="card">
    <p class="tag">每日新词</p>
    <div class="segs">
      ${[5, 8, 12].map((n) => `<button class="seg ${s.dailyNew === n ? 'on' : ''}" data-action="set-new" data-n="${n}">${n} 个</button>`).join('')}
    </div>
    <label class="switch">
      <input type="checkbox" data-action="toggle-tts" ${s.tts ? 'checked' : ''}>
      <span>点读音时自动朗读（浏览器内置语音）</span>
    </label>
  </section>

  <section class="card">
    <p class="tag">数据</p>
    <p class="muted small">${Object.keys(p.words).length} 条记忆 · ${p.runs || 0} 局 · 只存在这台设备</p>
    <div class="actions">
      <button class="ghost" data-action="export">导出存档</button>
      <button class="ghost" data-action="import">导入存档</button>
    </div>
    <button class="danger" data-action="reset">清空本机进度</button>
  </section>

  <section class="card">
    <p class="tag">关于</p>
    <p class="muted small">每日一局 20 分钟单词 roguelike。词库来自 ECDICT / JMdict，语料为真实媒体改写。</p>
    <p class="muted small">v1 的旧进度会在首次启动时自动迁移，只迁词的记忆与打卡。</p>
  </section>
  `;
}
