/* OnlyBae service worker.
 *
 * Strategy:
 *   - App shell (logo, offline page) is precached on install.
 *   - /_next/static/* is cache-first (fingerprinted, never stale).
 *   - Navigation requests are network-first with an offline HTML fallback.
 *   - API calls and cross-origin requests (S3, CloudFront, Google OAuth, etc.)
 *     are passed through untouched — signed URLs expire and user data is
 *     authenticated so caching would cause data leaks or 403s.
 *
 * Bump CACHE_VERSION whenever the app shell changes in a breaking way.
 */

const CACHE_VERSION = 'v3';
const SHELL_CACHE = `onlybae-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `onlybae-static-${CACHE_VERSION}`;

// Things we want available even when offline.
const SHELL_ASSETS = [
  '/logo.jpg',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll is all-or-nothing; if any fail install fails. Use individual adds.
      Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(url).catch(() => { /* ignore missing asset */ })
        )
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Allow the page to ask us to activate a new worker immediately.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET. Everything else (POST, PUT, etc.) passes through.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin (CDN, S3, OAuth, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Never cache API calls — signed URLs, auth, user data.
  if (url.pathname.startsWith('/api/')) return;

  // Next.js fingerprinted static assets: cache-first (immutable).
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML navigation: network-first, fall back to cache, finally offline shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          // Cache a fresh copy for offline fallback.
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match('/offline.html');
          if (offline) return offline;
          return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      })()
    );
    return;
  }

  // Other same-origin GETs (images in /public, etc.): cache-first with revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchAndCache = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchAndCache;
    })
  );
});
