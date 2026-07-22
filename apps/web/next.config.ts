import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.KAFIL_NEXT_DIST_DIR ?? ".next",
  serverExternalPackages: ["reflect-metadata"],
  allowedDevOrigins: ["192.168.1.13"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
