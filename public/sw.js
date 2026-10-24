// Every push produces a visible notification (required by Safari/iOS).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Safe generic notification. */ }
  event.waitUntil(self.registration.showNotification(payload.title || 'Friend Care', {
    body: payload.body || 'Bạn có tin nhắn mới',
    icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    tag: `chat-${payload.messageId || 'new'}`,
    data: { url: '/chat' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL('/chat', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  })());
});
