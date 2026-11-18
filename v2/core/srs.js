/**
 * 间隔重复：经典 Leitner box（0-5）+ 到期日。
 * 只被「战斗结果」调用，且失败只影响局内表现 —— 见 adjust()。
 */

/** 每个 box 的复隔天数 */
export const BOX_INTERVAL = [0, 1, 2, 4, 7, 15, 30];
export const MAX_BOX = 5;

export function newWordState(id) {
  return { b: 0, due: 0, c: 0, w: 0, t: 0, last: 0 };
}

export function todayInt(d = new Date()) {
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}

/**
 * 答题后更新记忆状态。
 * - 答对：box 升一级（最高 5），due 按间隔推后
 * - 答错：box 降一级（最低 0），但不低于 0；连错不影响已掌握的天数记忆之外的任何东西
 * 注意：局内失败【不调用】此函数，见 battle.js 的 onDefeat()
 */
export function review(state, id, correct, now = todayInt()) {
  const s = state[id] || newWordState(id);
  s.t = (s.t || 0) + 1;
  s.last = now;
  if (correct) {
    s.c += 1;
    s.b = Math.min(MAX_BOX, s.b + 1);
    s.w = 0;
  } else {
    s.w += 1;
    s.b = Math.max(0, s.b - 1);
  }
  s.due = now + BOX_INTERVAL[s.b];
  state[id] = s;
  return s;
}

export function isDue(s, now = todayInt()) {
  return !s || (s.due || 0) <= now;
}

export function mastery(s) {
  if (!s) return 0;
  return Math.min(1, s.b / MAX_BOX);
}

/** 记忆强度 0-100，用于界面展示（不是概率） */
export function strength(s) {
  if (!s) return 0;
  const base = (s.b / MAX_BOX) * 100;
  const penalty = Math.min(30, (s.w || 0) * 6);
  return Math.max(0, Math.round(base - penalty));
}
