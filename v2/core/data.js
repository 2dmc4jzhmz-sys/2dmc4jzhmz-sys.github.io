/** 数据加载：按语言 + 级别分片，内存缓存，避免重复请求 */
const cache = new Map();

async function getJSON(url) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url, { cache: 'force-cache' })
    .then((r) => {
      if (!r.ok) throw new Error(`${url} ${r.status}`);
      return r.json();
    })
    .catch((e) => {
      cache.delete(url);
      throw e;
    });
  cache.set(url, p);
  return p;
}

export const loadLevel = (lang, lvl) => getJSON(`data/${lang}/level${lvl}.json`);
export const loadTexts = (lang) => getJSON(`data/${lang}/texts.json`);
export const loadMeta = () => getJSON('data/meta.json');

/** 取某语言当前可用的全部词（按已解锁级别） */
export async function loadPool(lang, cap = 1) {
  const levels = [];
  for (let i = 1; i <= Math.max(1, cap); i++) levels.push(i);
  const lists = await Promise.all(levels.map((l) => loadLevel(lang, l)));
  return lists.flat();
}
