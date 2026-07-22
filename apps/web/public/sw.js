const CACHE_NAME = "kafil-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/kafil-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Kafil contains sensitive family and financial data. Never cache API calls,
  // authenticated pages, or their responses. Only show the static offline page
  // when a document navigation cannot reach the server.
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
});
