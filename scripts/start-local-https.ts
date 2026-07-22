import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";

const publicPort = Number(process.env.KAFIL_LOCAL_HTTPS_PORT ?? 3000);
const upstreamPort = Number(process.env.KAFIL_LOCAL_HTTP_PORT ?? 3001);

function privateIpv4Address() {
  const addresses = Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);

  return (
    process.env.KAFIL_LOCAL_HTTPS_ADDRESS ??
    addresses.find((address) => address.startsWith("192.168.")) ??
    addresses.find((address) => address.startsWith("10.")) ??
    addresses.find((address) => {
      const match = /^172\.(\d+)\./.exec(address);
      const second = Number(match?.[1]);
      return second >= 16 && second <= 31;
    }) ??
    addresses[0]
  );
}

const localAddress = privateIpv4Address();
if (!localAddress) {
  throw new Error("No local Wi-Fi IPv4 address was found.");
}

const certificatePath = resolve(
  process.env.KAFIL_LOCAL_HTTPS_CERT ?? "certificates/local-wifi.pem",
);
const keyPath = resolve(
  process.env.KAFIL_LOCAL_HTTPS_KEY ?? "certificates/local-wifi-key.pem",
);

if (!existsSync(certificatePath) || !existsSync(keyPath)) {
  throw new Error(
    "Local HTTPS certificate missing. Generate certificates/local-wifi.pem and certificates/local-wifi-key.pem for the current Wi-Fi IP first.",
  );
}

const externalOrigin = `https://${localAddress}:${publicPort}`;
const upstreamOrigin = `http://127.0.0.1:${upstreamPort}`;
const nextCli = resolve("apps/web/node_modules/next/dist/bin/next");

const nextProcess = Bun.spawn(
  ["node", nextCli, "start", "apps/web", "-H", "127.0.0.1", "-p", String(upstreamPort)],
  {
    env: {
      ...process.env,
      FRONTEND_URL: externalOrigin,
      NAJM_AUTH_BASE_URL: `${upstreamOrigin}/api`,
      NODE_ENV: "production",
      PORT: String(upstreamPort),
    },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  },
);

async function waitForNext() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (nextProcess.exitCode !== null) {
      throw new Error(`Next.js exited before startup with code ${nextProcess.exitCode}.`);
    }

    try {
      const response = await fetch(`${upstreamOrigin}/manifest.webmanifest`);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }

    await Bun.sleep(500);
  }

  throw new Error("Timed out waiting for the production Next.js server.");
}

await waitForNext();

const proxy = Bun.serve({
  hostname: "0.0.0.0",
  port: publicPort,
  tls: {
    cert: Bun.file(certificatePath),
    key: Bun.file(keyPath),
  },
  async fetch(request, server) {
    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, upstreamOrigin);
    const headers = new Headers(request.headers);
    const clientAddress = server.requestIP(request)?.address;

    headers.delete("host");
    headers.set("accept-encoding", "identity");
    headers.set("x-forwarded-host", incomingUrl.host);
    headers.set("x-forwarded-proto", "https");
    if (clientAddress) headers.set("x-forwarded-for", clientAddress);

    return fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });
  },
});

console.log(`\nKafil production is available on your phone at ${externalOrigin}`);
console.log(`Internal Next.js server: ${upstreamOrigin}`);
console.log("Press Ctrl+C to stop both servers.\n");

let shuttingDown = false;
async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  proxy.stop(true);
  if (nextProcess.exitCode === null) nextProcess.kill();
  await nextProcess.exited;
  process.exit(exitCode);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

void nextProcess.exited.then((exitCode) => {
  if (!shuttingDown) void shutdown(exitCode || 1);
});
