const CACHE_NAME = 'pokemon-game-v3';

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

// Handle Range requests for video files from cache
async function handleRangeRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request.url, { ignoreSearch: true });
  if (!cached) return fetch(request);

  const buf = await cached.arrayBuffer();
  const total = buf.byteLength;
  const rangeHeader = request.headers.get('Range');

  if (!rangeHeader) {
    return new Response(buf, {
      status: 200,
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': total },
    });
  }

  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : total - 1;
  const chunk = buf.slice(start, end + 1);

  return new Response(chunk, {
    status: 206,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': chunk.byteLength,
      'Accept-Ranges': 'bytes',
    },
  });
}

// Fetch strategy:
// - HTML / JS / CSS → network first (always get latest deploy), fallback to cache
// - Everything else (sprites, sounds, video) → cache first (fast, offline-friendly)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle video Range requests specially
  if (url.pathname.endsWith('.mp4')) {
    event.respondWith(handleRangeRequest(event.request));
    return;
  }

  const isAppShell =
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css');

  if (isAppShell) {
    // Network first: always fetch fresh, cache as fallback
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
  } else {
    // Cache first: sprites, sounds, images load instantly
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      }).catch(() => caches.match('/'))
    );
  }
});
