/**
 * 本地存档：单一 key，带 schema 版本，支持从 v1（english_planet_v1_*）迁移。
 * 词的进度按 `词|词性` 索引，与词库分片解耦 —— 重新导出词库不会丢进度。
 */

import { wordKey } from './keys.js';

export { wordKey };

const KEY = 'ep2_state';
const SCHEMA = 2;
const blankLang = () => ({
  words: {},
  streak: 0,
  lastDay: null,
  runs: 0,
  wins: 0,
  gold: 0,
  best: 0,
  days: {},
  collection: {},
  migrated: false,
});

const defaults = () => ({
  v: SCHEMA,
  lang: 'en',
  settings: { tts: true, dailyNew: 12, hp: 100 },
  langs: { en: blankLang(), ja: blankLang() },
});

function merge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const out = { ...base, ...patch };
  out.words = { ...(base.words || {}), ...(patch.words || {}) };
  out.collection = { ...(base.collection || {}), ...(patch.collection || {}) };
  out.days = { ...(base.days || {}), ...(patch.days || {}) };
  out.settings = { ...base.settings, ...(patch.settings || {}) };
  return out;
}

export function load() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    raw = null;
  }
  const base = defaults();
  const force = (o) => {
    o.settings.dailyNew = 12; // 固定 12，旧存档也一并纠正
    return o;
  };
  if (!raw || raw.v !== SCHEMA) {
    const fixed = merge(base, raw || {});
    fixed.v = SCHEMA;
    migrated = true;
    return force(fixed);
  }
  return force(merge(base, raw));
}

let migrated = false;
export const state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[state] 保存失败', e);
  }
}

export const langProgress = (lang = state.lang) => state.langs[lang];

export function setLang(lang) {
  if (!state.langs[lang]) return;
  state.lang = lang;
  save();
}

/* ---------------- v1 迁移 ---------------- */

const dayFrom = (due) => {
  if (!due) return 0;
  if (typeof due === 'number') return due > 100000 ? due : 0;
  const d = new Date(due);
  return isNaN(d) ? 0 : Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
};

/**
 * 旧存档形如 { adult: { wx: {word: {box,succ,due}}, hist, streak... }, active }
 * 只迁词的记忆状态与打卡，其余（连击、成就）按设计重置。
 */
export function migrateV1(pool) {
  if (state.langs.en.migrated && state.langs.ja.migrated) return null;
  const report = { en: 0, ja: 0 };
  for (const lang of ['en', 'ja']) {
    if (state.langs[lang].migrated) continue;
    let raw = null;
    try {
      raw = JSON.parse(localStorage.getItem('english_planet_v1_' + lang) || 'null');
    } catch {
      raw = null;
    }
    const prof = raw && (raw[raw.active || 'adult'] || raw.adult);
    const wx = (prof && prof.wx) || {};
    const words = state.langs[lang].words;
    let n = 0;
    for (const [word, old] of Object.entries(wx)) {
      const hit = pool.find((x) => x.w === word);
      if (!hit) continue;
      const k = wordKey(hit.w, hit.p);
      words[k] = {
        b: Math.max(0, Math.min(5, old.box || 0)),
        due: dayFrom(old.due),
        c: old.succ || 0,
        w: 0,
        t: (old.succ || 0),
        last: 0,
      };
      n++;
    }
    if (prof) {
      state.langs[lang].streak = prof.streak || 0;
      state.langs[lang].days = prof.hist || {};
    }
    state.langs[lang].migrated = true;
    report[lang] = n;
  }
  save();
  return report;
}

/* ---------------- 数值与解锁 ---------------- */

export function masteredCount(p) {
  return Object.values(p.words).filter((s) => (s.b || 0) >= 4).length;
}

export function levelCap(p) {
  const m = masteredCount(p);
  return Math.min(5, 1 + Math.floor(m / 200));
}

export function markDay(p, dayKey, add = 1) {
  p.days[dayKey] = (p.days[dayKey] || 0) + add;
  if (p.lastDay !== dayKey) {
    const prev = p.lastDay;
    p.lastDay = dayKey;
    const y = new Date(Date.now() - 86400000);
    const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    p.streak = prev === yKey ? (p.streak || 0) + 1 : 1;
  }
}
