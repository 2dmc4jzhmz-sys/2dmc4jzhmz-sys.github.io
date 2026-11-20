/* 英语星球 v2 已下线（2026-11-20 起 /v2/ 直接跳回旧版）
 * 这个文件被替换成「自毁」逻辑：
 * 手机上下一次打开 /v2/ 时，浏览器会因为 sw.js 内容变了而安装这个新版，
 * 它一激活就删掉 ep2-* 缓存、注销自己，并让页面重新走网络，
 * 这样 index.html 里的跳转页才有机会生效。
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('ep2-')).map((k) => caches.delete(k)));
    } catch (err) { /* 忽略 */ }

    try {
      await self.registration.unregister();
    } catch (err) { /* 忽略 */ }

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) {
      try { c.navigate(c.url); } catch (err) { /* 忽略 */ }
    }
  })());
});

/* 兜底：不再代理任何请求，全部走网络 */
self.addEventListener('fetch', () => {});
