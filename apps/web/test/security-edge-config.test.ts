import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const traefik = readFileSync(
  new URL("../../../deploy/traefik.security.dynamic.example.yml", import.meta.url),
  "utf8",
);
const caddy = readFileSync(
  new URL("../../../deploy/Caddyfile", import.meta.url),
  "utf8",
);
const verifier = readFileSync(
  new URL("../../../scripts/verifySecurityHeaders.sh", import.meta.url),
  "utf8",
);

describe("production security header contracts", () => {
  test("the Dokploy Traefik middleware covers the browser security baseline", () => {
    for (const contract of [
      "contentTypeNosniff: true",
      "frameDeny: true",
      "referrerPolicy: strict-origin-when-cross-origin",
      "permissionsPolicy: camera=(), geolocation=(), microphone=()",
      "stsSeconds: 31536000",
      "stsIncludeSubdomains: true",
      "stsPreload: false",
      'X-Powered-By: ""',
    ]) {
      expect(traefik).toContain(contract);
    }
    expect(traefik).not.toContain("contentSecurityPolicy:");
    expect(traefik).not.toContain("contentSecurityPolicyReportOnly:");
  });

  test("the optional Caddy edge keeps the enforceable policy in parity", () => {
    for (const contract of [
      "-X-Powered-By",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(caddy).toContain(contract);
    }
    expect(caddy).not.toContain("\n\t\tContent-Security-Policy ");
    expect(caddy).not.toContain("Content-Security-Policy-Report-Only");
  });

  test("the public verifier checks pages and API responses", () => {
    expect(verifier).toContain('verify_path "/" "yes"');
    expect(verifier).toContain('verify_path "/api/system/health"');
    expect(verifier).toContain('local require_csp="${2:-no}"');
    expect(verifier).toContain('"script-src \'self\' \'nonce-"');
    expect(verifier).toContain('require_absent "Content-Security-Policy-Report-Only"');
    expect(verifier).toContain('require_absent "X-Powered-By"');
  });
});

describe("najm-next configuration contract", () => {
  const resolved = async () => (await import("najm-next/config")).default;

  test("the preset owns the app-layer security and runtime keys", async () => {
    const config = await resolved();
    expect(config.poweredByHeader).toBe(false);
    expect(config.serverExternalPackages).toContain("reflect-metadata");
  });
});
