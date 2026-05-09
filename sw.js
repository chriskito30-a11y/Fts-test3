const CACHE = 'fts-v4';
const FILES = [
  './manifest.json',
  './fts192.png',
  './fts512.png',
  './forum.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(FILES.map(f => cache.add(f)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // On ne cache que les requêtes GET (POST/PUT/etc. ne sont pas cachables)
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ═══ NOTIFICATIONS PUSH ═══════════════════════════
self.addEventListener('push', function(event) {
  let data = { title: 'Fais Ton Show', body: 'Nouveau message', url: './forum.html' };
  try { if (event.data) data = event.data.json(); } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './fts192.png',
      badge: './fts192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || './forum.html' }
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes('forum') && 'focus' in client) return client.focus();
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});
