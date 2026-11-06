/// <reference lib="webworker" />
// Service worker : met l'application en cache pour qu'elle fonctionne hors-ligne.
// Pense à incrémenter CACHE_NAME à chaque mise en production pour forcer la mise à jour du cache.

export {};
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'score-counter-v16';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Répond depuis le cache si possible, et rafraîchit le cache en arrière-plan.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());

      return cached ?? network;
    }),
  );
});
