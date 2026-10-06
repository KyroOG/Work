/* Work — service worker
 * Cache-first for the app shell; everything here is static and local, so a
 * simple versioned cache is enough. Bump CACHE to force an update.
 */
const CACHE = 'work-v12';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/fonts.css',
  './css/tokens.css',
  './css/base.css',
  './css/icons.css',
  './css/components.css',
  './js/core/utils.js',
  './js/core/events.js',
  './js/core/title.js',
  './js/core/theme.js',
  './js/core/dates.js',
  './js/core/store.js',
  './js/core/router.js',
  './js/services/sounds.js',
  './js/services/audio.js',
  './js/services/notify.js',
  './js/services/wake.js',
  './js/services/timer.js',
  './js/services/alarms.js',
  './js/services/assistant.js',
  './js/ui/dom.js',
  './js/ui/toast.js',
  './js/ui/sheet.js',
  './js/ui/select.js',
  './js/ui/time-field.js',
  './js/ui/ring.js',
  './js/ui/task-editor.js',
  './js/ui/alarm-editor.js',
  './js/views/tasks.js',
  './js/views/focus.js',
  './js/views/alarms.js',
  './js/views/settings.js',
  './js/app.js',
  './fonts/fraunces-soft.woff2',
  './fonts/fraunces-soft-italic.woff2',
  './fonts/dm-sans.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.ok) caches.open(CACHE).then((cache) => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
