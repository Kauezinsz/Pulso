const CACHE_NAME = "pulso-pwa-v13-sw-hardening";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20260611-authfix",
  "./app.js?v=20260612-auth-hardening",
  "./receipt-camera.js?v=20260611-authfix",
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
  if (url.origin !== self.location.origin) return;

  const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, "");
  const apiPrefix = scopePath === "/" ? "" : scopePath;
  const isApi = apiPrefix
    ? url.pathname.startsWith(`${apiPrefix}/api/`) || url.pathname.startsWith(`${apiPrefix}/auth/`)
    : url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/");

  if (isApi) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isDocument = event.request.mode === "navigate" || event.request.destination === "document";
  const isShellAsset = ["style", "script", "image", "font", "manifest"].includes(event.request.destination);

  if (isDocument) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
          }
          return response;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  if (isShellAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
          }
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }
});
