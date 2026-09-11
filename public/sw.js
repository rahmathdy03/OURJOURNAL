const STATIC_CACHE = "oj-static-v3";
const PRIVATE_CACHE = "oj-private-v3";
const OFFLINE_URL = "/offline.html";
const STATIC_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/kebab-finka-192.png",
  "/icons/kebab-finka-512.png",
];

function isStaticRequest(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|woff2?|png|jpe?g|gif|svg|webp|ico)$/i.test(url.pathname)
  );
}

function isCacheablePage(url) {
  if (url.origin !== self.location.origin) return false;
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname === "/login" ||
    url.pathname === "/offline.html"
  ) {
    return false;
  }
  return true;
}

async function putPrivatePage(request, response) {
  if (!response || !response.ok || response.redirected) return;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return;
  const url = new URL(request.url);
  if (!isCacheablePage(url)) return;
  const cache = await caches.open(PRIVATE_CACHE);
  await cache.put(request, response.clone());
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("oj-") &&
                ![STATIC_CACHE, PRIVATE_CACHE].includes(key)
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "CLEAR_PRIVATE_CACHE") {
    event.waitUntil(caches.delete(PRIVATE_CACHE));
    return;
  }

  if (data.type === "CACHE_ROUTES" && Array.isArray(data.routes)) {
    event.waitUntil(
      (async () => {
        for (const route of data.routes) {
          try {
            const url = new URL(String(route), self.location.origin);
            if (!isCacheablePage(url)) continue;
            const request = new Request(url.href, {
              method: "GET",
              credentials: "include",
              headers: { Accept: "text/html" },
            });
            const response = await fetch(request);
            await putPrivatePage(request, response);
          } catch {
            // Offline/cache warming is best-effort.
          }
        }
      })()
    );
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          await putPrivatePage(request, response);
          return response;
        } catch {
          const cache = await caches.open(PRIVATE_CACHE);
          const exact = await cache.match(request);
          if (exact) return exact;

          const byPath = await cache.match(url.pathname);
          if (byPath) return byPath;

          return (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })()
    );
    return;
  }

  if (isStaticRequest(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return Response.error();
        }
      })()
    );
  }
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
  const fallbackIcon = kebabNotification
    ? "/icons/kebab-finka-192.png"
    : "/icon";
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
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
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
