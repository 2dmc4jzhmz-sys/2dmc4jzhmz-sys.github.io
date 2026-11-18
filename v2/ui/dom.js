/** 极简 DOM 工具：不引入框架，靠模板字符串 + 事件委托 */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function html(strings, ...vals) {
  return strings.reduce((out, s, i) => out + s + (vals[i] ?? ''), '');
}

export function mount(el, node) {
  el.innerHTML = '';
  if (typeof node === 'string') el.innerHTML = node;
  else el.appendChild(node);
}

export function on(root, selector, type, handler) {
  root.addEventListener(type, (e) => {
    const t = e.target.closest(selector);
    if (t && root.contains(t)) handler(e, t);
  });
}

export function toast(msg, ms = 1600) {
  const box = document.getElementById('toast');
  if (!box) return;
  box.textContent = msg;
  box.classList.add('show');
  clearTimeout(box._t);
  box._t = setTimeout(() => box.classList.remove('show'), ms);
}

export function vibrate(pattern = 12) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

export const fmtDate = (d = new Date()) =>
  `${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${'日一二三四五六'[d.getDay()]}`;

export function el(tag, attrs = {}, children = '') {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  n.innerHTML = children;
  return n;
}
