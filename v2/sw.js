/* 英语星球 v2 Service Worker
 * 缓存名从注册 URL 的 ?v= 参数取，改 cfg.js 的 BUILD 即可整体轮换。
 */
const V = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `ep2-${V}`;

const CORE = [
  './',
  'index.html',
  'app.js',
  'cfg.js',
  'styles/main.css',
  'manifest.json',
  'favicon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'core/rng.js',
  'core/srs.js',
  'core/state.js',
  'core/keys.js',
  'core/data.js',
  'games/run.js',
  'games/questions.js',
  'games/drops.js',
  'ui/dom.js',
  'ui/today.js',
  'ui/dungeon.js',
  'ui/result.js',
  'ui/stats.js',
  'ui/settings.js',
  'ui/reading.js',
  'data/meta.json',
  'data/en/level1.json',
  'data/ja/level1.json',
  'data/en/texts.json',
  'data/ja/texts.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // 逐个加入，任一失败不影响其它资源
      await Promise.all(
        CORE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null))
      );
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => hit)
    )
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
