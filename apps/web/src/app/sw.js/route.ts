import { createNajmServiceWorker } from "najm-next/pwa";

export const GET = createNajmServiceWorker({
  cacheId: "kafil-shell",
  cacheVersion: "v1",
  offlineUrl: "/offline.html",
  precache: ["/icons/kafil-192.png"],
  push: {
    defaultTitle: "Kafil",
    notificationPath: "/notifications",
    icon: "/icons/kafil-192.png",
    badge: "/icons/kafil-192.png",
  },
});
