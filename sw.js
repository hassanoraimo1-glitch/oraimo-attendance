self.addEventListener('install', (e) => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (e) => {
  // يترك الطلبات تمر بشكل طبيعي حالياً
  e.respondWith(fetch(e.request));
});
