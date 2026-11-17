/* Service Worker ZHEDVANOIS - aman untuk Firebase (data akun tidak di-cache) */
const VERSION = 'v1';
const SHELL = `zhed-shell-${VERSION}`;
const RUNTIME = `zhed-runtime-${VERSION}`;
const SHELL_FILES = [
  './', './index.html', './offline.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'
];

// Host yang TIDAK boleh di-cache (login & database)
const NO_CACHE = [
  'firestore.googleapis.com', 'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com', 'firebaseapp.com', 'accounts.google.com',
  'apis.google.com', 'emailjs.com', 'wa.me'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![SHELL, RUNTIME].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (NO_CACHE.some(h => url.hostname.endsWith(h))) return;

  // Halaman: network-first, fallback cache lalu offline.html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./offline.html')))
    );
    return;
  }

  // Aset lain (CDN, font, gambar): stale-while-revalidate
  e.respondWith(
    caches.open(RUNTIME).then(cache =>
      cache.match(req).then(cached => {
        const fetched = fetch(req).then(res => {
          if (res && (res.status === 200 || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetched;
      })
    )
  );
});
