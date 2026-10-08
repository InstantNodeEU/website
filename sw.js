/* InstantNode PWA service worker.
   Network-first passthrough: the dashboard is live data, so we never serve
   stale app state. The tiny offline fallback only covers full navigation
   failures (no connection at all). */
const OFFLINE_URL = '/offline.html';
const CACHE = 'inn-pwa-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});
