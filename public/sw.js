// Minimal Service Worker for PWA Installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // We don't cache anything for now, just need the SW to exist 
  // so the browser sees it as a valid installable PWA
  event.respondWith(fetch(event.request));
});
