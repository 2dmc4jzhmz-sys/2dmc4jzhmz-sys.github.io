/** 种子随机：同一 seed 永远产出同一局，便于复现与跨设备一致 */

export function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seedStr) {
  const rnd = mulberry32(hashStr(String(seedStr)));
  const api = {
    next: rnd,
    int: (min, max) => min + Math.floor(rnd() * (max - min + 1)),
    float: (min, max) => min + rnd() * (max - min),
    pick: (arr) => arr[Math.floor(rnd() * arr.length)],
    chance: (p) => rnd() < p,
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    /** 按权重取：[[item, weight], ...] */
    weighted: (pairs) => {
      const total = pairs.reduce((s, p) => s + p[1], 0);
      let r = rnd() * total;
      for (const [item, w] of pairs) {
        r -= w;
        if (r <= 0) return item;
      }
      return pairs[pairs.length - 1][0];
    },
    /** 派生新种子，用于隔离不同子系统，避免互相干扰随机序列 */
    derive: (tag) => createRng(seedStr + '/' + tag),
  };
  return api;
}

export const todayKey = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
