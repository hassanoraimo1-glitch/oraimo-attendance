// Service Worker for Oraimo HR PWA
// ✅ FIXED: v17 — فرض تحديث الكاش + عدم كاش requests الـ API

const CACHE_NAME = 'oraimo-hr-v17'; // ✅ FIX: bumped من v16 عشان يفرض تحديث كل الملفات
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/styles/main.css',
  '/src/app.js',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Install v17');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return Promise.all(
          urlsToCache.map((u) => cache.add(u).catch((err) => console.warn('[SW] skip cache add', u, err)))
        );
      })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate v17');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event strategy:
// - API/external: passthrough (never cache)
// - Navigations: network-first with cached index fallback
// - Scripts: network-first (update cache on success)
// - Other static: cache-first
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isExternal = req.url.includes('supabase') || req.url.includes('onesignal') || req.url.includes('googleapis') || req.url.includes('esm.sh');

  // ✅ FIX: أي request فيه supabase أو external → passthrough بدون كاش
  if (!isSameOrigin || isExternal) {
    return;
  }

  // ✅ FIX: أي POST/PATCH/DELETE → passthrough
  if (req.method !== 'GET') {
    return;
  }

  const isNavigation = req.mode === 'navigate';
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/index.html', responseToCache));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  const dest = req.destination || '';
  const isStaticAsset = ['style', 'script', 'image', 'font'].includes(dest);

  if (!isStaticAsset) {
    return;
  }

  // ✅ FIX: Scripts → always network-first, ثم cache fallback
  if (dest === 'script') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const contentType = (response.headers.get('content-type') || '').toLowerCase();
            if (!contentType.includes('text/html')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
            }
          }
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Other static assets → cache-first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        const expectsHtml = dest === 'document';
        const gotHtml = contentType.includes('text/html');
        if (!expectsHtml && gotHtml) return response;

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, responseToCache));
        return response;
      });
    })
  );
});

// Push notification handler
self.addEventListener('push', event => {
  console.log('[SW] Push received');
  
  let title = 'Oraimo HR';
  let options = {
    body: 'لديك إشعار جديد',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      if (data.url) options.data.url = data.url;
    } catch (e) {
      options.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click');
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url === '/' || client.url.includes('/index.html')) {
            return client.focus();
          }
        }
        return clients.openWindow('/');
      })
  );
});
