// Committed Progressive Web App Service Worker
const CACHE_NAME = 'committed-pwa-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/progress',
  '/progress.html',
  '/analytics',
  '/analytics.html',
  '/manage',
  '/manage-habits.html',
  '/settings',
  '/settings.html',
  '/habit-detail.html',
  '/css/main.css',
  '/css/components.css',
  '/css/animations.css',
  '/js/utils.js',
  '/js/offlineStore.js',
  '/js/api.js',
  '/js/app.js',
  '/js/progress.js',
  '/js/analytics.js',
  '/js/habitStudio.js',
  '/js/habitDetail.js',
  '/js/settings.js',
  '/favicon.svg',
  '/manifest.json',
  '/img/logo.svg',
  'https://unpkg.com/lucide@latest'
];

// Install: Cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll with graceful failure for external CDN if offline during install
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Pre-caching failed for ${url}:`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up older caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests (handled by OfflineStore in client)
  if (req.method !== 'GET') {
    return;
  }

  // 1. Navigation requests (HTML pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          // Fallback to cache for the exact URL or root index.html
          const cached = await caches.match(req);
          if (cached) return cached;

          // Check clean path fallback
          const pathname = url.pathname;
          if (pathname === '/progress') return (await caches.match('/progress.html')) || (await caches.match('/progress'));
          if (pathname === '/analytics') return (await caches.match('/analytics.html')) || (await caches.match('/analytics'));
          if (pathname === '/manage') return (await caches.match('/manage-habits.html')) || (await caches.match('/manage'));
          if (pathname === '/settings') return (await caches.match('/settings.html')) || (await caches.match('/settings'));
          if (pathname.startsWith('/habit/')) return caches.match('/habit-detail.html');

          return (await caches.match('/')) || (await caches.match('/index.html'));
        })
    );
    return;
  }

  // 2. API GET requests (Network-first with cache backup)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response(JSON.stringify({ success: false, offline: true, error: 'Offline - served from cache' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 3. Static Assets (CSS, JS, Fonts, Images): Cache-First with Network Revalidate
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => cachedRes);

      return cachedRes || fetchPromise;
    })
  );
});
