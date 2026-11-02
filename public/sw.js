/*
 * Topline service worker — deliberately conservative.
 *
 *  - Caches ONLY same-origin static files: hashed build assets (/assets/*), icons, brand images and /offline.html.
 *  - Never caches or answers HTML pages, API/Supabase calls, payment flows, auth, or anything non-GET.
 *    Navigations always go to the network; if the network is down the branded offline page is shown.
 *  - Updates are applied only when the person taps "Update" (SKIP_WAITING message), so a deploy can never
 *    reload the app in the middle of checkout.
 *
 * Bump VERSION to invalidate every cache.
 */
const VERSION = 'v1';
const SHELL_CACHE = `topline-shell-${VERSION}`;
const ASSET_CACHE = `topline-assets-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png', '/topline-brand-mark.svg', '/favicon.svg'];
const MAX_ASSET_ENTRIES = 150;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith('topline-') && !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

function cacheable(response) {
  return response && response.status === 200 && response.type === 'basic';
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response)) {
    cache.put(request, response.clone());
    trim(ASSET_CACHE, MAX_ASSET_ENTRIES);
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (cacheable(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return hit || (await refresh) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, payment providers, maps, CDNs: never touched.
  if (url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request).catch(() => Response.error()));
    return;
  }

  if (/^\/(icons|images)\//.test(url.pathname) || /\.(?:svg|png|jpe?g|webp|avif|woff2?)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
