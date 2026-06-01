const CACHE_NAME = 'quadrante-v1';
const urlsToCache = [
  '/dist/',
  '/dist/index.html',
  '/dist/manifest.json',
  '/dist/icon-192.png',
  '/dist/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});