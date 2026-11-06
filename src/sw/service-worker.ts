/// <reference lib="webworker" />
// Service worker : garde une copie de l'application pour qu'elle fonctionne hors-ligne.
// Stratégie « réseau d'abord » : avec du réseau, on sert toujours la dernière version publiée ;
// la copie locale ne sert que hors-ligne, ou si le réseau met trop de temps à répondre.
// Pense à incrémenter CACHE_NAME à chaque mise en production.

export {};
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'score-counter-v18';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];
/** Au-delà, si une copie locale existe, on la sert plutôt que de faire attendre (réseau très lent). */
const NETWORK_TIMEOUT_MS = 3000;

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

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;
  event.respondWith(networkFirst(event));
});

async function networkFirst(event: FetchEvent): Promise<Response> {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);

  const network = fetch(request).then(response => {
    if (response.ok) void cache.put(request, response.clone());
    return response;
  });
  // La mise à jour du cache continue même si on a déjà répondu avec la copie locale.
  event.waitUntil(network.then(() => undefined, () => undefined));

  const cached =
    (await cache.match(request)) ?? (request.mode === 'navigate' ? await cache.match('./index.html') : undefined);
  if (!cached) return network.catch(() => Response.error());

  const timeout = new Promise<Response>(resolve => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
  return Promise.race([network, timeout]).catch(() => cached);
}
