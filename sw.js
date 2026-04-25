// Service Worker for Oraimo HR PWA
// This handles offline caching and push notifications

const CACHE_NAME = 'oraimo-hr-v14';
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
  console.log('[SW] Install');
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
  console.log('[SW] Activate');
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
// - Navigations: network-first with cached index fallback
// - Scripts: network-first (then update cache) so new *.js files are never stuck behind old cache
// - Other static (style/image/font): cache-first
// - API/external requests: passthrough
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isExternal = req.url.includes('supabase') || req.url.includes('onesignal') || req.url.includes('googleapis');

  if (!isSameOrigin || isExternal) {
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
        // Protect against caching HTML into JS/CSS/image requests.
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
        // If a window client is already open, focus it
        for (let client of windowClients) {
          if (client.url === '/' || client.url.includes('/index.html')) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return clients.openWindow('/');
      })
  );
});
