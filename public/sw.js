self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "OURJOURNAL",
      body: event.data ? event.data.text() : "Ada pengingat baru.",
    };
  }

  const targetUrl = data.url || "/notifications";
  const kebabNotification = targetUrl.startsWith("/kebab");
  const fallbackIcon = kebabNotification ? "/icons/kebab-finka-192.png" : "/icon";
  const title = data.title || (kebabNotification ? "Kebab Finka" : "OURJOURNAL");
  const options = {
    body: data.body || "Ada pengingat baru.",
    icon: data.icon || fallbackIcon,
    badge: data.badge || data.icon || fallbackIcon,
    tag: data.tag || "ourjournal",
    renotify: false,
    data: {
      url: targetUrl,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "/notifications",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
