/* Project 1430 — PWA Service Worker
 * - precaches core files
 * - runtime cache for images/audio
 * - works on GitHub Pages (relative paths)
 */

// RELEASE CANDIDATE: bump cache version so updates are guaranteed to apply
// RC hotfix: credits update
const VERSION = 'p1430-pwa-imgfix1';
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './scenes.json',
  './facts.json',
  './glossary.json',
  './towers.json',
  './waves.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './img/g01_young.jpg',
  './img/g02_home.jpg',
  './img/g03_pedinstitut.jpg',
  './img/g04_aspirant.jpg',
  './img/g05_militia.jpg',
  './img/g06_vnos.jpg',
  './img/g07_commander.jpg',
  './img/g08_academy.jpg',
  './img/g09_kb1.webp',
  './img/g10_s25.jpg',
  './img/g11_system_a.jpg',
  './img/g12_missile_launch.jpg',
  './img/g13_memorial_pro.jpg',
  './img/g14_serp_molot.jpg',
  './img/g15_lenin_prize.png',
  './img/g16_general.jpg',
  './img/g17_kisunko_1918_1998.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // Cache core assets, but don’t fail the install if one file is temporarily unavailable.
    await Promise.allSettled(
      CORE_ASSETS.map(async (asset) => {
        try {
          await cache.add(asset);
        } catch (_) {
          // ignore
        }
      })
    );
    self.skipWaiting();
  })());
});

// Позволяет приложению «мягко» применить обновление по кнопке
self.addEventListener('message', (event) => {
  const data = event && event.data;
  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
        return caches.delete(key);
      }
      return Promise.resolve();
    }));
    self.clients.claim();
  })());
});

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // no fallback for images/audio beyond cache
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || (await fetchPromise) || new Response('Offline', { status: 503, statusText: 'Offline' });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML navigation: always serve the cached shell if offline
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match('./index.html');
      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          cache.put('./index.html', response.clone());
        }
        return response;
      } catch (_) {
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Images & audio: cache-first runtime
  if (request.destination === 'image' || request.destination === 'audio') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else: SWR
  event.respondWith(staleWhileRevalidate(request));
});
