/* 甜品配方换算 · 离线缓存
   策略：一律「网络优先」。联网时始终使用 GitHub Pages 上的最新版本，
        断网时才回退到本机缓存，所以厨房里没信号也能打开。
   数据：配方存在 localStorage，完全不经过本文件，也永远不会上传到任何服务器。 */
const CACHE = 'dessert-recipe-book-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(PRECACHE.map(p =>
        c.add(new URL(p, self.registration.scope).href).catch(() => null)
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const INDEX_URL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  if(new URL(req.url).origin !== self.location.origin) return;
  const isNav = req.mode === 'navigate';
  e.respondWith(
    fetch(req).then(res => {
      if(res && res.ok && res.type === 'basic'){
        const copy = res.clone();
        // 页面导航统一用 index.html 作为缓存键，离线回退更可靠
        caches.open(CACHE).then(c => c.put(isNav ? INDEX_URL : req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => (isNav ? caches.match(INDEX_URL) : caches.match(req))
      .then(hit => hit || Response.error()))
  );
});
