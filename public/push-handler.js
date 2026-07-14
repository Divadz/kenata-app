/* global self */
// Gestion des notifications push, importé par le service worker (Lot 6).

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: 'Kenata', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Kenata';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192-v2.png',
      badge: '/icons/icon-192-v2.png',
      tag: data.tag || undefined,
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(data.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Refocalise seulement si une fenêtre est déjà exactement sur la cible.
      const exact = wins.find((w) => w.url === target);
      if (exact) {
        await exact.focus();
        return;
      }
      // Sinon on ouvre l'URL absolue (fiable, y compris sur Firefox Android).
      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })()
  );
});
