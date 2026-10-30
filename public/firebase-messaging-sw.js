// Service Worker for Mingle Web Push Notifications (Android, iOS 16.4+ PWA, Desktop)

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Native Web Push listener (works reliably across iOS Safari WebKit, Android Chrome, and Desktop)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      notification: {
        title: "Mingle Notification",
        body: event.data.text(),
      },
    };
  }

  const notif = payload.notification || {};
  const data = payload.data || {};

  const title = notif.title || data.title || "Mingle";
  const options = {
    body: notif.body || data.body || "You have a new update on Mingle.",
    icon: notif.icon || "/icon.png",
    badge: notif.badge || "/icon.png",
    tag: data.tag || data.type || "mingle-notification",
    renotify: true,
    data: {
      url: data.url || notif.click_action || "/notifications",
      ...data,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/notifications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client && urlToOpen) {
              return client.navigate(urlToOpen);
            }
            return client;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
