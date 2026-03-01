const CACHE_NAME = 'pokemon-game-v1';

// Install: cache all game assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const spriteUrls = [];
      for (let i = 1; i <= 151; i++) {
        spriteUrls.push(`/sprites/${i}.png`);
      }
      return cache.addAll([
        '/',
        '/index.html',
        '/red-sprite.png',
        '/red-trainer.png',
        '/team-rocket.png',
        '/team-rocket-intro.mp4',
        '/team-rocket-encounter.mp3',
        '/sounds/intro.mp3',
        '/sounds/mewtwo-warning.mp3',
        '/sounds/evolve.mp3',
        '/sounds/sendout.mp3',
        '/sounds/catch.mp3',
        '/sounds/levelup.mp3',
        ...spriteUrls,
      ]);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache first, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache new requests dynamically (JS/CSS bundles from Vite)
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('/'))
  );
});
