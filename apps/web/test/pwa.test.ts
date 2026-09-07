import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import manifest from "../src/app/manifest";
import { GET as serviceWorker } from "../src/app/sw.js/route";

const publicDirectory = join(import.meta.dir, "..", "public");

async function pngSize(path: string) {
  const bytes = new Uint8Array(await Bun.file(path).arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe("PWA installability", () => {
  test("publishes a standalone manifest with phone icons", () => {
    const value = manifest();

    expect(value).toMatchObject({
      id: "/",
      name: "Kafil",
      short_name: "Kafil",
      start_url: "/",
      scope: "/",
      display: "standalone",
      theme_color: "#2f6e42",
    });
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
  });

  test.each([
    ["icons/kafil-192.png", 192],
    ["icons/kafil-512.png", 512],
    ["icons/kafil-maskable-512.png", 512],
    ["icons/kafil-apple-180.png", 180],
  ])("ships %s at the declared dimensions", async (file, size) => {
    expect(await pngSize(join(publicDirectory, file))).toEqual({ width: size, height: size });
  });

  test("keeps authenticated data out of the offline cache", async () => {
    const response = await serviceWorker();
    const worker = await response.text();

    expect(response.headers.get("content-type")).toBe("application/javascript; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-cache, no-store, must-revalidate");
    expect(worker).toContain('const CACHE_PREFIX = "najm-pwa:kafil-shell:"');
    expect(worker).toContain('const OFFLINE_URL = "/offline.html"');
    expect(worker).toContain('request.mode !== "navigate"');
    expect(worker).toContain("fetch(request).catch");
    expect(worker).not.toContain("cache.put");
    expect(worker).not.toContain('"/api/"');
  });

  test("configures the bounded shared Najm push worker contract", async () => {
    const response = await serviceWorker();
    const worker = await response.text();

    expect(worker).toContain('addEventListener("push"');
    expect(worker).toContain('addEventListener("notificationclick"');
    expect(worker).toContain('const PUSH_NOTIFICATION_PATH = "/notifications"');
    expect(worker).toContain('const PUSH_DEFAULT_TITLE = "Kafil"');
    expect(worker).toContain("data: { notificationId: payload.notificationId }");
    // The package rejects overlong or extra fields instead of truncating and
    // displaying a payload that did not satisfy the server contract.
    expect(worker).toContain("payload.notificationId.length > 100");
    expect(worker).toContain("payload.title.length > 120");
    expect(worker).toContain("payload.body.length > 300");
    expect(worker).toContain("Object.keys(payload).every((key) => PUSH_KEYS.has(key))");
    // Same-origin click target: an existing client is focused, otherwise a
    // new window opens on the fixed inbox route. Notification data carries
    // only the id — title/body are parsed for display but never stored.
    expect(worker).toContain("self.location.origin");
    expect(worker).toContain("self.clients.openWindow");
    expect(worker).toContain("client.focus()");
    expect(worker).not.toContain("data: { notificationId: payload.notificationId, title");
  });
});
