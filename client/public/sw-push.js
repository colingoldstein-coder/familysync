// Clear stale runtime caches on activation so updated icons/assets are fetched fresh
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.delete('static-assets')
  );
});

// Push notification event handlers (imported by generated service worker)

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/notification-badge.png',
    tag: data.tag || 'default',
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'FamilySync', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
