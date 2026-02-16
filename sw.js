const CACHE_VERSION = '2026021405'; // Update on each deploy
const CACHE_NAME = 'thailand-trip-v' + CACHE_VERSION;

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './core.js',
  './utils.js',
  './theme.js',
  './share.js',
  './expenses.js',
  './packing.js',
  './weather.js',
  './data.js',
  './actions.js',
  './trip-data.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // Do NOT call skipWaiting here — let the client decide when to activate
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Listen for skipWaiting message from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Stale-while-revalidate for HTML/JS/CSS; cache-first for other assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  const isUpdatable = event.request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css');

  if (isUpdatable) {
    // Stale-while-revalidate: serve from cache, fetch in background and update cache
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);

          return cached || fetchPromise;
        })
      )
    );
  } else {
    // Cache-first for images, fonts, etc.
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
