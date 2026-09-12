import type { NajmLocationRuntimeResolution } from "najm-next/location/server";

import { kafilLocation } from "@/lib/locationConfig";

const NONCE_PATTERN = /^[A-Za-z0-9+/_=-]+$/;

export function createCspNonce(): string {
  return btoa(globalThis.crypto.randomUUID());
}

export function createContentSecurityPolicy(
  nonce: string,
  isDevelopment = process.env.NODE_ENV === "development",
  location: NajmLocationRuntimeResolution = kafilLocation.resolve(process.env, {
    isDevelopment,
  }),
): string {
  if (!NONCE_PATTERN.test(nonce)) {
    throw new Error("CSP nonce contains unsupported characters");
  }

  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ];

  const imageSources = [
    "'self'",
    "data:",
    "blob:",
    "https://cdnjs.cloudflare.com",
    "https://tile.openstreetmap.org",
    ...location.csp.imgSrc.filter((source) => source !== "https://tile.openstreetmap.org"),
  ];
  const connectSources = ["'self'", ...location.csp.connectSrc];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    `img-src ${imageSources.join(" ")}`,
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ].join("; ");
}
