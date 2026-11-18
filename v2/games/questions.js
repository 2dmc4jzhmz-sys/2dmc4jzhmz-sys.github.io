/** 出题：从「到期复习 → 今日新词 → 已掌握维持」三池按序取词，再生成四选一 */
import { createRng } from '../core/rng.js';
import { isDue, todayInt } from '../core/srs.js';
import { wordKey } from '../core/keys.js';

const NEW_PER_DAY = 12;

/**
 * 生成本局题序。
 * @param {object} o
 * @param {Array} o.pool       当前语言可用词（已解锁级别）
 * @param {object} o.words     该语言的记忆状态 {key: {b,due,...}}
 * @param {number} o.need      需要的题数
 * @param {string} o.seed      种子
 * @param {number} o.dailyNew  今日新词上限
 */
export function buildQuestions({ pool, words, need, seed = 'q', dailyNew = NEW_PER_DAY }) {
  const rng = createRng(seed);
  const now = todayInt();
  const known = pool.filter((w) => words[wordKey(w.w, w.p)]);
  const unknown = pool.filter((w) => !words[wordKey(w.w, w.p)]);

  const due = known
    .filter((w) => isDue(words[wordKey(w.w, w.p)], now) && (words[wordKey(w.w, w.p)].b || 0) < 5)
    .sort((a, b) => (words[wordKey(a.w, a.p)].due || 0) - (words[wordKey(b.w, b.p)].due || 0));

  const fresh = unknown.slice(0, dailyNew);
  const maintenance = rng.shuffle(known.filter((w) => (words[wordKey(w.w, w.p)].b || 0) >= 4));

  // 复习优先，新词穿插在前半段，维持池兜底
  const ordered = [];
  const dueQ = due.slice(0, Math.max(0, need - fresh.length));
  ordered.push(...dueQ);
  ordered.push(...fresh);
  for (const w of maintenance) {
    if (ordered.length >= need) break;
    if (!ordered.includes(w)) ordered.push(w);
  }
  for (const w of rng.shuffle(pool)) {
    if (ordered.length >= need) break;
    if (!ordered.includes(w)) ordered.push(w);
  }

  const list = ordered.slice(0, need);
  return list.map((w, i) => makeQuestion(w, pool, rng.derive('q' + i)));
}

const askZh = (w) => w.z && w.z.length > 0;

export function makeQuestion(word, pool, rng) {
  const type = rng.chance(0.7) || !askZh(word) ? 'w2z' : 'z2w';
  const same = pool.filter((x) => x.w !== word.w && x.z && x.z !== word.z);
  const picked = [];
  const usedZh = new Set([word.z]);
  const usedW = new Set([word.w]);
  const near = (c) => Math.abs((c.z || '').length - (word.z || '').length) <= 5;
  // 先挑长度接近的，选不出来再放宽，避免答案明显最长/最短
  for (const pass of [true, false]) {
    for (const cand of rng.shuffle(same)) {
      if (picked.length >= 3) break;
      if (usedZh.has(cand.z) || usedW.has(cand.w)) continue;
      if (pass && !near(cand)) continue;
      usedZh.add(cand.z);
      usedW.add(cand.w);
      picked.push(cand);
    }
  }

  const answer = type === 'w2z' ? word.z : word.w;
  const distractors = picked.map((c) => (type === 'w2z' ? c.z : c.w));
  const options = rng.shuffle([answer, ...distractors]);

  return {
    id: word.i,
    key: wordKey(word.w, word.p),
    w: word.w,
    ph: word.ph || '',
    pos: word.p || '',
    zh: word.z,
    type,
    prompt: type === 'w2z' ? word.w : word.z,
    options,
    answer: options.indexOf(answer),
    isNew: false,
  };
}
