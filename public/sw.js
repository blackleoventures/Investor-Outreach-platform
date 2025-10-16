// Service Worker to force cache refresh
const CACHE_NAME = 'investor-outreach-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Bypass service worker for POST/multipart and non-GET requests to avoid upload issues
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const method = req.method || 'GET';
  const isGet = method === 'GET';

  if (!isGet) {
    // Let the network handle it directly for POST/PUT/etc.
    return; // do not call respondWith
  }

  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});