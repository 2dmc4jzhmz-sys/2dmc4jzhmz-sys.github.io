import { escapeHTML } from './dungeon.js';

export function renderReading(ctx) {
  const t = ctx.text;
  const paras = t.body.split('\n').filter(Boolean);
  return `
  <div class="dungeon reading">
    <header class="dhead">
      <button class="icon-btn" data-action="back-today">✕</button>
      <div class="dtitle"><p class="tag">${t.level.toUpperCase()} · ${t.source || '真实媒体改写'}</p><p class="muted small">${paras.length} 段 · 约 2 分钟</p></div>
      <button class="icon-btn" data-action="toggle-zh">${ctx.showZh ? '🙈' : '👀'}</button>
    </header>

    <section class="card article">
      <h2>${escapeHTML(t.title)}</h2>
      <div class="body">
        ${paras
          .map(
            (line, i) => `<p>${escapeHTML(line)}${
              ctx.showZh && t.zh[i] ? `<em class="zh">${escapeHTML(t.zh[i])}</em>` : ''
            }</p>`
          )
          .join('')}
      </div>
      <div class="targets">${(t.words || []).map((w) => `<span class="pill">${escapeHTML(w)}</span>`).join('')}</div>
    </section>

    ${t.q ? renderQ(t.q, ctx) : ''}
  </div>`;
}

function renderQ(q, ctx) {
  return `
  <section class="card qa">
    <p class="tag">读懂了吗</p>
    <p class="qtext">${escapeHTML(q.q)}</p>
    <div class="opts">
      ${q.opts
        .map(
          (o, i) => `<button class="opt" data-action="read-answer" data-i="${i}" ${
            ctx.answered != null ? 'disabled' : ''
          } data-state="${ctx.answered == null ? '' : i === q.a ? 'ok' : 'no'}">
            <b>${'ABCD'[i]}</b><span>${escapeHTML(o)}</span>
          </button>`
        )
        .join('')}
    </div>
    ${ctx.answered != null ? `<p class="muted small">${ctx.answered === q.a ? '对。' : '答案是 ' + 'ABCD'[q.a] + '。'} ${escapeHTML(q.z || '')}</p>` : ''}
  </section>`;
}
