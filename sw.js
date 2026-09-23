// 國中科技測驗・離線快取（只處理同源 GET）
// App 外殼（index/styles/app/章節清單…）cache-first，秒開；
// 題庫 questions/*.json 與 images/* 走 network-first（有網就拿新的、斷線才吃快取），
// 換題庫／補圖後不用清快取也會更新。子路徑部署（如 /tech-quiz/）亦適用。
const CACHE = 'tech-quiz-v2';
const CORE = ['index.html', 'styles.css', 'app.js', 'chapters.json', 'manifest.json', 'icon.svg'];
const DATA_RE = /(^|\/)(questions|images)\//;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin || e.request.method !== 'GET') return;
  if (DATA_RE.test(u.pathname)) {
    // 題庫與圖片：network-first，成功就更新快取；斷線才回退快取
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // App 外殼：cache-first
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
