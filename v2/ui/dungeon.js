/** 副本内视图：战斗 / 事件 / 宝箱 / 休息 */
import { html } from './dom.js';

const layerName = (l) => ['', '第一层 · 荒原', '第二层 · 石廊', '第三层 · 喉口'][l] || '';

function hpBar(hp, max, cls = '') {
  const pct = Math.max(0, Math.round((hp / max) * 100));
  return `<div class="hp ${cls}"><i style="width:${pct}%"></i><span>${hp} / ${max}</span></div>`;
}

function enemyBar(hits, need) {
  const pct = Math.max(0, Math.round(((need - hits) / need) * 100));
  return `<div class="hp enemy"><i style="width:${pct}%"></i><span>${Math.max(0, need - hits)} 击</span></div>`;
}

export function renderBattle(ctx) {
  const { run, node } = ctx;
  const b = run.battle;
  const q = b.question;
  const opts = q.options
    .map(
      (o, i) => `<button class="opt" data-action="answer" data-i="${i}">
        <b>${'ABCD'[i]}</b><span>${escapeHTML(o)}</span>
      </button>`
    )
    .join('');

  return `
  <div class="dungeon">
    <header class="dhead">
      <button class="icon-btn" data-action="quit-run" aria-label="退出">✕</button>
      <div class="dtitle">
        <p class="tag">${layerName(node.layer)}</p>
        <p class="muted small">节点 ${run.idx + 1} / ${run.nodes.length}</p>
      </div>
      <div class="gold">🪙 ${run.gold}</div>
    </header>

    <section class="enemy-card">
      <div class="enemy-face">${node.icon}</div>
      <div class="enemy-info">
        <p class="ename">${node.name}</p>
        ${enemyBar(b.hits, b.need)}
      </div>
    </section>

    <section class="qcard" data-q="${q.n}">
      <div class="qmeta">
        <span class="pill">${q.type === 'w2z' ? '选词义' : '选单词'}</span>
        ${run.combo >= 2 ? `<span class="pill hot">连击 ×${run.combo}</span>` : ''}
      </div>
      <div class="prompt">
        <p class="pw">${escapeHTML(q.prompt)}</p>
        ${q.ph ? `<button class="ph" data-action="speak" data-w="${escapeHTML(q.w)}">${escapeHTML(q.ph)} 🔊</button>` : ''}
        <p class="hint">答对造成 ${10 + run.bonusDmg + (run.combo >= 3 ? 5 : 0)} 伤害 · 答错掉 ${node.dmg} 体力</p>
      </div>
      <div class="opts">${opts}</div>
    </section>

    <footer class="dfoot">
      ${hpBar(run.hp, run.maxHp)}
      <div class="combo">${run.combo >= 2 ? '🔥'.repeat(Math.min(5, Math.floor(run.combo / 2))) : ''}</div>
    </footer>
  </div>`;
}

export function renderEvent(ctx) {
  const { node, ev } = ctx;
  return `
  <div class="dungeon">
    <header class="dhead">
      <button class="icon-btn" data-action="quit-run">✕</button>
      <div class="dtitle"><p class="tag">${layerName(node.layer)}</p><p class="muted small">事件</p></div>
      <div class="gold">🪙 ${ctx.run.gold}</div>
    </header>
    <section class="card scene">
      <div class="scene-icon">${node.icon}</div>
      <h2>${node.name}</h2>
      <p class="story">${ev.text}</p>
      <div class="choices">
        ${ev.choices
          .map(
            (c, i) => `<button class="choice" data-action="event" data-eff="${c.effect}" data-i="${i}">
              <b>${c.label}</b><em>${c.hint}</em>
            </button>`
          )
          .join('')}
      </div>
    </section>
    <footer class="dfoot">${hpBar(ctx.run.hp, ctx.run.maxHp)}</footer>
  </div>`;
}

export function renderChest(ctx) {
  return `
  <div class="dungeon">
    <header class="dhead">
      <button class="icon-btn" data-action="quit-run">✕</button>
      <div class="dtitle"><p class="tag">${layerName(ctx.node.layer)}</p><p class="muted small">宝箱</p></div>
      <div class="gold">🪙 ${ctx.run.gold}</div>
    </header>
    <section class="card scene">
      <div class="scene-icon">🎁</div>
      <h2>遗落的箱子</h2>
      <p class="story">箱盖半开着，里面只能拿走一样。</p>
      <div class="choices">
        ${ctx.choices
          .map(
            (c) => `<button class="choice" data-action="chest" data-key="${c.key}">
              <b>${c.icon} ${c.name}</b><em>${c.desc}</em>
            </button>`
          )
          .join('')}
      </div>
    </section>
    <footer class="dfoot">${hpBar(ctx.run.hp, ctx.run.maxHp)}</footer>
  </div>`;
}

export function renderRest(ctx) {
  return `
  <div class="dungeon">
    <header class="dhead">
      <button class="icon-btn" data-action="quit-run">✕</button>
      <div class="dtitle"><p class="tag">${layerName(ctx.node.layer)}</p><p class="muted small">篝火</p></div>
      <div class="gold">🪙 ${ctx.run.gold}</div>
    </header>
    <section class="card scene">
      <div class="scene-icon">🔥</div>
      <h2>余烬篝火</h2>
      <p class="story">只剩一截还在烧。<b>恢复 30% 体力</b>，或者把炭收进袋子换 <b>+2 攻击</b>。</p>
      <div class="choices">
        <button class="choice" data-action="rest" data-mode="heal"><b>坐下休息</b><em>回血 30%</em></button>
        <button class="choice" data-action="rest" data-mode="buff"><b>取走炭火</b><em>本局攻击 +2</em></button>
      </div>
    </section>
    <footer class="dfoot">${hpBar(ctx.run.hp, ctx.run.maxHp)}</footer>
  </div>`;
}

export function renderDropToast(drops) {
  if (!drops || !drops.length) return '';
  return html`<div class="drop-pop">${drops
    .map((d) => `<span class="drop ${d.rarity}">${d.icon} ${d.name}</span>`)
    .join('')}</div>`;
}

export function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
