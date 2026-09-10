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
      title: "Kebab Finka",
      body: event.data ? event.data.text() : "Ada pembaruan stok.",
    };
  }

  const title = data.title || "Kebab Finka";
  const options = {
    body: data.body || "Ada pembaruan stok.",
    icon: "/icons/kebab-finka-192.png",
    badge: "/icons/kebab-finka-192.png",
    tag: data.tag || "kebab-finka",
    renotify: false,
    data: {
      url: data.url || "/kebab-finka",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "/kebab-finka",
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
