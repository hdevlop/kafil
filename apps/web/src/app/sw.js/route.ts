import { createNajmServiceWorker } from "najm-next/pwa";

export const GET = createNajmServiceWorker({
  cacheId: "kafil-shell",
  cacheVersion: "v1",
  offlineUrl: "/offline.html",
  precache: ["/icons/kafil-192.png"],
});
