// Dolap tarayıcı sürümünün service worker şablonu (derlemede önbellek adı ve dosya listesi doldurulur).
// Bütün dosyalar ilk açılışta önbelleğe alınır; program sonra internetsiz de açılır.
// Sayfa (index.html) önce sunucudan istenir ki yeni sürüm yayımlanınca hemen gelsin.
const CACHE = '__CACHE__';
const FILES = __FILES__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dolap-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./', { ignoreVary: true })),
    );
    return;
  }
  event.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req)));
});
