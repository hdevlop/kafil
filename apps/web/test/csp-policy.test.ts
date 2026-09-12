import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { readBoundedJson, sanitizeCspReports } from "../src/lib/cspReports";
import {
  createContentSecurityPolicy,
  createCspNonce,
} from "../src/lib/contentSecurityPolicy";
import { kafilLocation } from "../src/lib/locationConfig";
import { POST } from "../src/app/api/csp-report/route";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
const read = (path: string) => readFileSync(join(repoRoot, path), "utf8");

const SOURCES = [
  "deploy/Caddyfile",
  "deploy/traefik.security.dynamic.example.yml",
];

describe("the per-request application policy", () => {
  const nonce = "test-nonce_123=";
  const enforced = createContentSecurityPolicy(nonce, false);

  test("enforces every directive the app can satisfy", () => {

    for (const directive of [
      "default-src 'self'",
      "base-uri 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "frame-src 'none'",
      "manifest-src 'self'",
      "media-src 'self'",
      "object-src 'none'",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ]) {
      expect(enforced).toContain(directive);
    }

    expect(enforced).toContain(
      "img-src 'self' data: blob: https://cdnjs.cloudflare.com https://tile.openstreetmap.org",
    );
  });

  test("authorizes scripts only through a fresh nonce", () => {
    const scriptSrc = enforced.split(";").find((part) => part.trim().startsWith("script-src"));

    // 'unsafe-inline' is still present and is documented as such — but an
    // injected `<script src="https://…">` must remain blocked either way.
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).toContain(`'nonce-${nonce}'`);
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("http");
    expect(scriptSrc).not.toContain("*");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  test("allows React's development evaluator only outside production", () => {
    expect(createContentSecurityPolicy(nonce, true)).toContain("'unsafe-eval'");
  });

  test("adds only the configured location tile origin", () => {
    const location = kafilLocation.resolve({
      KAFIL_LOCATION_TILE_URL: "https://tiles.example.test/{z}/{x}/{y}.png",
      KAFIL_LOCATION_TILE_ATTRIBUTION: "Example tiles",
    });
    const policy = createContentSecurityPolicy(nonce, false, location);

    expect(policy).toContain("https://tiles.example.test");
    expect(policy).not.toContain("{z}");
  });

  test("reports violations to the bounded application sink", () => {
    expect(enforced).toContain("report-uri /api/csp-report");
  });

  test("generates a different valid nonce for each request", () => {
    const first = createCspNonce();
    const second = createCspNonce();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(second).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });

  test("rejects a nonce that could alter the directive", () => {
    expect(() => createContentSecurityPolicy("bad'; script-src *", false)).toThrow();
  });
});

describe("the edge preserves the application's nonce policy", () => {
  test.each(SOURCES)("%s does not overwrite CSP", (source) => {
    const text = read(source);

    expect(text).not.toMatch(/\n\s*Content-Security-Policy(?:-Report-Only)?\s+"/);
    expect(text).not.toMatch(/\n\s*contentSecurityPolicy(?:ReportOnly)?:\s+"/);
  });
});

describe("strict-CSP client initialization", () => {
  test("configures Zod before hydration with the request nonce", () => {
    const layout = read("apps/web/src/app/layout.tsx");

    expect(layout).toContain('headers()');
    expect(layout).toContain('requestHeaders.get("x-nonce")');
    expect(layout).toContain('strategy="beforeInteractive"');
    expect(layout).toContain('nonce={nonce}');
    expect(layout).toContain('__zod_globalConfig.jitless = true');
  });
});

describe("the violation sink refuses to log what it was sent", () => {
  test("a document URI's query string never reaches the log line", () => {
    const [report] = sanitizeCspReports({
      "csp-report": {
        "document-uri": "https://kafala360.ma/reset-password?token=SECRET-RESET-TOKEN#frag",
        "violated-directive": "script-src",
        "effective-directive": "script-src",
        "blocked-uri": "https://evil.test/x?session=SECRET-SESSION",
      },
    });

    expect(report.documentUri).toBe("https://kafala360.ma/reset-password");
    expect(JSON.stringify(report)).not.toContain("SECRET-RESET-TOKEN");
    expect(JSON.stringify(report)).not.toContain("SECRET-SESSION");
  });

  test("CSP keywords are kept, since they carry no data", () => {
    const [report] = sanitizeCspReports({
      "csp-report": { "effective-directive": "script-src", "blocked-uri": "inline" },
    });
    expect(report.blockedUri).toBe("inline");
  });

  test("the Reporting API batch shape is understood too", () => {
    const reports = sanitizeCspReports([
      { body: { effectiveDirective: "style-src", blockedURL: "inline", disposition: "report" } },
      { body: { effectiveDirective: "img-src", blockedURL: "https://evil.test/a?b=c" } },
    ]);

    expect(reports).toHaveLength(2);
    expect(reports[1].blockedUri).toBe("https://evil.test/a");
  });

  test("every field is length-capped", () => {
    const [report] = sanitizeCspReports({
      "csp-report": { "violated-directive": "x".repeat(5_000), "blocked-uri": "inline" },
    });
    expect(report.violatedDirective.length).toBeLessThanOrEqual(257);
  });

  test("an oversized body is dropped before it is parsed", async () => {
    const huge = JSON.stringify({ "csp-report": { "blocked-uri": "y".repeat(20_000) } });
    const request = new Request("https://kafala360.ma/api/csp-report", {
      method: "POST",
      body: huge,
    });

    expect(await readBoundedJson(request)).toBeNull();
  });

  test("a body with no Content-Length is bounded by the read, not after it", async () => {
    // A sender that omits Content-Length gets no free pass: the cap has to
    // stop the read itself, or the endpoint holds whatever was streamed at it.
    let produced = 0;
    let cancelled = false;
    const chunk = new TextEncoder().encode("z".repeat(4_096));

    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (produced >= 256 * 1024) return controller.close();
        produced += chunk.byteLength;
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });

    const request = new Request("https://kafala360.ma/api/csp-report", {
      method: "POST",
      body,
      // @ts-expect-error -- required by undici/Bun for a streaming request body
      duplex: "half",
    });
    expect(request.headers.get("content-length")).toBeNull();

    expect(await readBoundedJson(request)).toBeNull();
    expect(cancelled).toBe(true);
    // Never consumed the whole 256 KiB the sender was willing to produce.
    expect(produced).toBeLessThanOrEqual(16_384);
  });

  test("a body just under the cap is still read normally", async () => {
    const filler = "u".repeat(7_000);
    const request = new Request("https://kafala360.ma/api/csp-report", {
      method: "POST",
      body: JSON.stringify({ "csp-report": { "blocked-uri": "inline", note: filler } }),
    });

    expect(await readBoundedJson(request)).not.toBeNull();
  });

  test("garbage, empty, and valid bodies are answered identically", async () => {
    for (const body of ["not json", "", "[]", JSON.stringify({ "csp-report": {} })]) {
      const response = await POST(
        new Request("https://kafala360.ma/api/csp-report", { method: "POST", body }),
      );
      expect(response.status).toBe(204);
    }
  });

  test("nothing from the request is echoed back to the caller", async () => {
    const response = await POST(
      new Request("https://kafala360.ma/api/csp-report", {
        method: "POST",
        body: JSON.stringify({ "csp-report": { "blocked-uri": "https://evil.test/probe" } }),
      }),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});
