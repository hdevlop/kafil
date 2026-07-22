import { fileURLToPath } from "node:url";
import { createServer } from "node:net";

async function findAvailablePort() {
  if (process.env.KAFIL_WEB_SMOKE_PORT) {
    return process.env.KAFIL_WEB_SMOKE_PORT;
  }

  const server = createServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not reserve a smoke-test port");
  }

  const port = String(address.port);
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  return port;
}

const port = await findAvailablePort();
const appRoot = fileURLToPath(new URL("..", import.meta.url));
const origin = `http://127.0.0.1:${port}`;

const child = Bun.spawn({
  cmd: ["node", "node_modules/next/dist/bin/next", "start", "-p", port],
  cwd: appRoot,
  env: process.env,
  stdout: "inherit",
  stderr: "inherit",
});

async function waitUntilReady() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js exited before startup with code ${child.exitCode}`);
    }

    try {
      const response = await fetch(`${origin}/login`, { redirect: "manual" });

      if (response.status === 200 && child.exitCode === null) {
        return;
      }
    } catch {
      // The server is still starting.
    }

    await Bun.sleep(1_000);
  }

  throw new Error("Timed out waiting for the production server");
}

const publicPaths = [
  "/",
  "/login",
  "/register/sponsor",
  "/forgot-password",
  "/reset-password?token=smoke",
];
const protectedPaths = [
  "/dashboard",
  "/operator",
  "/operator/families",
  "/operator/children",
  "/operator/sponsors",
  "/operator/assignments",
  "/operator/contributions",
  "/operator/budgets",
  "/operator/categories",
  "/operator/products",
  "/operator/inventory",
  "/operator/orders",
  "/operator/settings",
  "/family",
  "/family/children",
  "/family/budget",
  "/family/catalog",
  "/family/cart",
  "/family/orders",
  "/sponsor",
  "/sponsor/support",
  "/sponsor/contributions",
  "/sponsor/budgets",
  "/sponsor/orders",
  "/sponsor/profile",
  "/sponsor/profile",
];
const notFoundPaths = ["/this-kafil-page-does-not-exist"];

try {
  await waitUntilReady();

  for (const path of publicPaths) {
    const response = await fetch(`${origin}${path}`, { redirect: "manual" });
    console.log(`${response.status}\t-\t${path}`);

    if (response.status !== 200) {
      throw new Error(`Expected ${path} to return 200, received ${response.status}`);
    }
  }

  for (const path of protectedPaths) {
    const response = await fetch(`${origin}${path}`, { redirect: "manual" });
    const location = response.headers.get("location") ?? "-";
    console.log(`${response.status}\t${location}\t${path}`);

    if (
      ![302, 303, 307, 308].includes(response.status) ||
      !location.startsWith("/login")
    ) {
      throw new Error(
        `Expected ${path} to redirect to login, received ${response.status} ${location}`,
      );
    }
  }

  for (const path of notFoundPaths) {
    const response = await fetch(`${origin}${path}`, { redirect: "manual" });
    console.log(`${response.status}\t-\t${path}`);

    if (response.status !== 404) {
      throw new Error(`Expected ${path} to return 404, received ${response.status}`);
    }
  }
} finally {
  child.kill();
  await child.exited;
}
