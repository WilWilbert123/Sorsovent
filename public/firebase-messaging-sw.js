// Service Worker for Mingle Web Push Notifications (Android, iOS 16.4+ PWA, Desktop)

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Ensures notification click URLs resolve strictly to the application's own origin,
 * preventing open-redirect phishing via crafted push payloads.
 */
function getSafeSameOriginUrl(rawUrl) {
  const fallback = `${self.location.origin}/notifications`;
  if (!rawUrl || typeof rawUrl !== "string") return fallback;
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin !== self.location.origin) {
      return fallback;
    }
    return parsed.href;
  } catch {
    return fallback;
  }
}

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
  const safeUrl = getSafeSameOriginUrl(
    data.url || notif.click_action || "/notifications"
  );

  const options = {
    body: notif.body || data.body || "You have a new update on Mingle.",
    icon: notif.icon || "/icon.png",
    badge: notif.badge || "/icon.png",
    tag: data.tag || data.type || "mingle-notification",
    renotify: true,
    data: {
      ...data,
      url: safeUrl,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = getSafeSameOriginUrl(
    event.notification.data?.url || "/notifications"
  );

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
