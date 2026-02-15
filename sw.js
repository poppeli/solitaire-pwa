const CACHE_NAME = 'pasianssi-v15';

const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/main.js',
  './js/engine/Card.js',
  './js/engine/Deck.js',
  './js/engine/Pile.js',
  './js/engine/GameState.js',
  './js/rules/BaseGame.js',
  './js/rules/KlondikeGame.js',
  './js/rules/SpiderGame.js',
  './js/rules/FreeCellGame.js',
  './js/rules/GameRegistry.js',
  './js/render/CardRenderer.js',
  './js/render/BoardRenderer.js',
  './js/render/AnimationManager.js',
  './js/input/InputManager.js',
  './js/ui/HUD.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
  );
});
