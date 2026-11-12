// 顧講話：把照片檔存在 iPad 上，第二次打開就不用再下載
// 照片檔（data/*.js?v=版本）：先用存好的；版本號變了就是新網址，會重新下載
// 網頁本身（index.html 等）：先上網拿最新的，沒網路時才用存好的
const CACHE = "gjh-v1";

self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()));

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const isData = /\/data\/[^/]+\.js$/.test(url.pathname) && url.searchParams.has("v");
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isData) {
      const hit = await cache.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) {
        cache.put(e.request, res.clone());
        // 同一個檔案的舊版本刪掉，避免佔空間
        const old = await cache.keys();
        old.filter(r => { const u = new URL(r.url); return u.pathname === url.pathname && u.search !== url.search; })
           .forEach(r => cache.delete(r));
      }
      return res;
    }
    try {
      const res = await fetch(e.request);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
