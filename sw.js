// Service Worker for Oraimo HR PWA
// ✅ FINAL FIX v18: forced JS reload + no API caching

const CACHE_NAME = 'oraimo-hr-v18';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install
self.addEventListener('install', event => {
  console.log('[SW] Install v18');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => Promise.all(
      urlsToCache.map((u) => cache.add(u).catch((err) => console.warn('[SW] skip', u, err)))
    ))
  );
  self.skipWaiting();
});

// Activate — delete all old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate v18');
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.map(n => n !== CACHE_NAME ? caches.delete(n) : null)
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isExternal = req.url.includes('supabase') || req.url.includes('onesignal') ||
                     req.url.includes('googleapis') || req.url.includes('esm.sh');

  // ✅ External requests (Supabase API) — never cache
  if (!isSameOrigin || isExternal) return;

  // ✅ Non-GET — never cache
  if (req.method !== 'GET') return;

  const isNavigation = req.mode === 'navigate';
  const dest = req.destination || '';

  // ✅ Navigation: network-first
  if (isNavigation) {
    event.respondWith(
      fetch(req).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // ✅ Scripts: ALWAYS network-first (so updates reach users)
  if (dest === 'script') {
    event.respondWith(
      fetch(req).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const ct = (response.headers.get('content-type') || '').toLowerCase();
          if (!ct.includes('text/html')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
        }
        return response;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // ✅ Other static (images, css, fonts): cache-first
  if (['style', 'image', 'font'].includes(dest)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const ct = (response.headers.get('content-type') || '').toLowerCase();
          if (ct.includes('text/html') && dest !== 'document') return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return response;
        });
      })
    );
  }
});

// Push notifications
self.addEventListener('push', event => {
  let title = 'Oraimo HR';
  let options = {
    body: 'لديك إشعار جديد',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { dateOfArrival: Date.now(), primaryKey: 1 }
  };
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      if (data.url) options.data.url = data.url;
    } catch (e) { options.body = event.data.text(); }
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      for (let c of wins) {
        if (c.url === '/' || c.url.includes('/index.html')) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});

// ✅ Listen for skipWaiting message from app
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
