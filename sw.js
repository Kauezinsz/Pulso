const CACHE_NAME = "pulso-pwa-v10";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, "");
  const apiPrefix = scopePath === "/" ? "" : scopePath;
  const apiMatch =
    (apiPrefix ? url.pathname.startsWith(`${apiPrefix}/api/`) : url.pathname.startsWith("/api/")) ||
    (apiPrefix ? url.pathname.startsWith(`${apiPrefix}/auth/`) : url.pathname.startsWith("/auth/"));

  if (url.origin === self.location.origin && apiMatch) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (event.request.mode === "navigate" || event.request.destination === "style" || event.request.destination === "script" || event.request.destination === "image") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match("./index.html"));
      }),
  );
});
