import { resolve } from "node:path";

const host = "127.0.0.1";
const appPort = 3220;
const proxyPort = 3221;
const fixture = resolve(
  import.meta.dir,
  "../apps/web/test/fixtures/rate-proxy-app",
);
const nextBin = resolve(
  fixture,
  "node_modules/next/dist/bin/next",
);

function assertPortFree(port: number) {
  const reservation = Bun.serve({
    fetch: () => new Response("reserved"),
    hostname: host,
    port,
  });
  reservation.stop(true);
}

async function run(command: string[]) {
  const child = Bun.spawn(command, {
    cwd: fixture,
    env: { ...process.env, NODE_ENV: "production" },
    stderr: "inherit",
    stdout: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`command failed with exit code ${exitCode}`);
}

async function waitForNext() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${appPort}/`);
      if (response.status < 500) return;
    } catch {
      // The managed production server is still starting.
    }
    await Bun.sleep(100);
  }
  throw new Error("Next.js production server did not become ready");
}

async function expectStatuses(
  path: string,
  requests: Array<{ client: string; forwarded?: string; mode?: string }>,
  expected: number[],
) {
  const observed: number[] = [];
  for (const request of requests) {
    const headers = new Headers({
      "x-test-client-address": request.client,
      "x-test-forward-mode": request.mode ?? "normal",
    });
    if (request.forwarded) headers.set("x-forwarded-for", request.forwarded);
    const response = await fetch(`http://${host}:${proxyPort}${path}`, { headers });
    observed.push(response.status);
  }
  if (observed.join(",") !== expected.join(",")) {
    throw new Error(
      `${path} returned [${observed.join(", ")}], expected [${expected.join(", ")}]`,
    );
  }
}

assertPortFree(appPort);
assertPortFree(proxyPort);

await run(["bun", "install", "--no-save"]);
await run(["bun", nextBin, "build", "."]);

const next = Bun.spawn(["bun", nextBin, "start", ".", "-p", String(appPort)], {
  cwd: fixture,
  env: { ...process.env, NODE_ENV: "production" },
  stderr: "inherit",
  stdout: "inherit",
});

let proxy: ReturnType<typeof Bun.serve> | undefined;
try {
  await waitForNext();
  proxy = Bun.serve({
    hostname: host,
    port: proxyPort,
    async fetch(request) {
      const headers = new Headers(request.headers);
      const clientAddress = headers.get("x-test-client-address") ?? "203.0.113.1";
      const mode = headers.get("x-test-forward-mode") ?? "normal";
      headers.delete("x-test-client-address");
      headers.delete("x-test-forward-mode");

      if (mode === "short") {
        headers.delete("x-forwarded-for");
      } else if (mode === "malformed") {
        const supplied = headers.get("x-forwarded-for");
        headers.set("x-forwarded-for", [supplied, "not-an-address"].filter(Boolean).join(", "));
      } else {
        const supplied = headers.get("x-forwarded-for");
        headers.set("x-forwarded-for", [supplied, clientAddress].filter(Boolean).join(", "));
      }

      const target = new URL(request.url);
      target.hostname = host;
      target.port = String(appPort);
      target.protocol = "http:";
      const upstream = await fetch(target, { headers, method: request.method });
      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.delete("content-encoding");
      responseHeaders.delete("content-length");
      return new Response(upstream.body, {
        headers: responseHeaders,
        status: upstream.status,
      });
    },
  });

  await expectStatuses(
    "/api/rate-probe/normal",
    [
      { client: "203.0.113.7", forwarded: "198.51.100.10" },
      { client: "203.0.113.7", forwarded: "192.0.2.44" },
      { client: "203.0.113.7", forwarded: "198.18.0.1" },
      { client: "203.0.113.8", forwarded: "198.51.100.10" },
    ],
    [200, 200, 429, 200],
  );
  await expectStatuses(
    "/api/rate-probe/malformed",
    [
      { client: "203.0.113.7", forwarded: "198.51.100.10", mode: "malformed" },
      { client: "203.0.113.7", forwarded: "192.0.2.44", mode: "malformed" },
      { client: "203.0.113.7", forwarded: "198.18.0.1", mode: "malformed" },
    ],
    [200, 200, 429],
  );
  await expectStatuses(
    "/api/rate-probe/short",
    [
      { client: "203.0.113.7", mode: "short" },
      { client: "203.0.113.8", mode: "short" },
      { client: "203.0.113.9", mode: "short" },
    ],
    [200, 200, 429],
  );

  console.log(
    "Local proxy acceptance passed: spoof rotation stayed limited, trusted clients separated, malformed and short chains failed closed.",
  );
} finally {
  proxy?.stop(true);
  next.kill();
  await next.exited;
}
