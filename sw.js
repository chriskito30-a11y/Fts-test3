/* ================================================================
   SW.JS — Service Worker Fais Ton Show
   Stratégie : Network First avec fallback cache.
   Incrémente CACHE_VERSION à chaque déploiement pour invalider
   l'ancien cache.
   ================================================================ */

const CACHE_VERSION = 'fts-v3';

const PRECACHE_FILES = [
  '/',
  '/index.html',
  '/membres.html',
  '/saison.html',
  '/forum.html',
  '/profs.html',
  '/manifest.json',
  '/assets/css/fts.css',
  '/assets/js/fts-utils.js',
  '/assets/js/fts-firebase.js',
  '/assets/js/fts-pwa.js',
  '/assets/img/fts192.png',
  '/assets/img/fts512.png',
];

/* ── INSTALL ─────────────────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_FILES))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE ────────────────────────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH — Network First avec fallback cache ───────────────── */
self.addEventListener('fetch', event => {
  // On n'intercepte pas les requêtes externes (Firebase, Sheets, Cloudinary…)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Ne pas cacher les requêtes POST
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache la réponse fraîche
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

/* ── NOTIFICATIONS PUSH ──────────────────────────────────────── */
self.addEventListener('push', function(event) {
  let data = {
    title: 'Fais Ton Show',
    body:  'Nouveau message dans le forum',
    url:   '/forum.html',
  };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/assets/img/fts192.png',
      badge:   '/assets/img/fts192.png',
      vibrate: [200, 100, 200],
      data:    { url: data.url },
    })
  );
});

/* ── CLICK NOTIFICATION ──────────────────────────────────────── */
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/forum.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
