const NONCE_PATTERN = /^[A-Za-z0-9+/_=-]+$/;

export function createCspNonce(): string {
  return btoa(globalThis.crypto.randomUUID());
}

export function createContentSecurityPolicy(
  nonce: string,
  isDevelopment = process.env.NODE_ENV === "development",
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

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "img-src 'self' data: blob: https://cdnjs.cloudflare.com",
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
