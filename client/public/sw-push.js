// Clear stale runtime caches on activation so updated icons/assets are fetched fresh
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.delete('static-assets')
  );
});

// Push notification event handlers (imported by generated service worker)

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // If payload can't be parsed, show a generic notification
  }

  const options = {
    body: data.body || 'You have a new update',
    icon: '/pwa-192x192.png',
    badge: '/notification-badge.png',
    tag: data.tag || 'default',
    renotify: true,           // Always alert even if replacing a notification with same tag
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    data: { url: data.url || '/' },
  };

  // Must always show a notification when userVisibleOnly is true,
  // otherwise the browser may revoke push permission
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
