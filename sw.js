// Service Worker for Oraimo HR PWA - v13 (Refactored Version)
// Handles offline caching for 18+ modules and push notifications

const CACHE_NAME = 'oraimo-hr-v13'; // تم التحديث لـ v13 لإجبار المتصفح على تحميل الموديولات الجديدة
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/app.js',
  
  // --- Core Modules ---
  '/src/core/fallbacks.js',
  '/src/core/data.js',
  '/src/core/bootstrap.js',
  
  // --- Main Feature Modules ---
  '/src/modules/ui.js',
  '/src/modules/auth.js',
  '/src/modules/attendance.js',
  '/src/modules/sales.js',
  '/src/modules/leaves.js',
  '/src/modules/chat.js',
  '/src/modules/specs.js',
  
  // --- Admin Sub-Modules ---
  '/src/modules/admin/dashboard.js',
  '/src/modules/admin/employees.js',
  '/src/modules/admin/admins.js',
  '/src/modules/admin/branches.js',
  '/src/modules/admin/targets.js',
  '/src/modules/admin/reports.js',
  '/src/modules/admin/visits.js',
  '/src/modules/admin/display.js',
  
  // --- Assets ---
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Install v13');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching all new modules');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches (v12 and older)
self.addEventListener('activate', event => {
  console.log('[SW] Activate v13');
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

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              // لا تقم بتخزين استدعاءات الـ API أو OneSignal
              const url = event.request.url;
              if (!url.includes('supabase') && 
                  !url.includes('onesignal') && 
                  !url.includes('googleapis')) {
                cache.put(event.request, responseToCache);
              }
            });
          
          return response;
        });
      })
  );
});

// Push & Notification Click Handlers (باقي الكود كما هو لضمان عمل الإشعارات)
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
    } catch (e) {
      options.body = event.data.text();
    }
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
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
