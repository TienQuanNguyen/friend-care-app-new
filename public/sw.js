/**
 * Service Worker for Web Push Notifications - Friend Care App
 *
 * Primary notification handler for background and closed tab events.
 */

/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Tin nhắn mới';
    const careSpaceId = payload.careSpaceId || 'global';
    const url = payload.url || '/chat';

    const options = {
      body: payload.body || '',
      icon: payload.icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: `chat-${careSpaceId}`, // Scoped per conversation
      renotify: true,
      data: {
        url,
        careSpaceId,
      },
    };

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if user is currently focused on the active chat room window
        const isChatFocused = clientList.some((client) => {
          return client.focused && client.url.includes('/chat');
        });

        // If user is actively focused on the chat page, suppress duplicate notification
        if (isChatFocused) {
          return Promise.resolve();
        }

        return self.registration.showNotification(title, options);
      })
    );
  } catch (err) {
    console.error('[SW] Failed to handle push event:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/chat';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no tab is open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
