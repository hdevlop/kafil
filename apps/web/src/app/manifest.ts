import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Kafil",
    short_name: "Kafil",
    description: "Trusted sponsorship with privacy, accountability, and care.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8faf7",
    theme_color: "#2f6e42",
    orientation: "any",
    icons: [
      {
        src: "/icons/kafil-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/kafil-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/kafil-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
