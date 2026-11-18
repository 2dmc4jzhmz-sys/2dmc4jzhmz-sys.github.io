export function renderResult(ctx) {
  const r = ctx.result;
  const drops = r.drops.length
    ? r.drops.map((d) => `<span class="drop ${d.rarity}">${d.icon} ${d.name}</span>`).join('')
    : '<span class="muted">这一局什么都没带出来</span>';

  return `
  <div class="dungeon result ${r.win ? 'win' : 'lose'}">
    <section class="verdict">
      <div class="vicon">${r.win ? '🏆' : '💀'}</div>
      <h2>${r.win ? '通关' : '倒在了半路'}</h2>
      <p class="muted">${r.win ? '遗忘之喉安静了。明天它会换个样子回来。' : '掉落清空，连胜归零 —— 但你背过的词一个都没少。'}</p>
    </section>

    <section class="stats-grid">
      <div><b>${r.cleared}/${r.total}</b><span>节点</span></div>
      <div><b>${r.maxCombo}</b><span>最高连击</span></div>
      <div><b>${r.gold}</b><span>金币</span></div>
      <div><b>${r.hp}</b><span>剩余体力</span></div>
    </section>

    <section class="card">
      <p class="tag">带出来的东西</p>
      <div class="drops">${drops}</div>
    </section>

    <div class="actions">
      <button class="primary wide" data-action="back-today">回到今天</button>
      <button class="ghost wide" data-action="start-run">再打一局（练手，不计连续）</button>
    </div>
  </div>`;
}
