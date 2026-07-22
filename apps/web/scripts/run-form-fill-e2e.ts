import { resolve } from "node:path";

const webRoot = resolve(import.meta.dir, "..");
const childEnvironment: Record<string, string | undefined> = {
  ...process.env,
  KAFIL_E2E_MANAGED_SERVER: "1",
  KAFIL_NEXT_DIST_DIR: ".next-form-fill-e2e",
};

let exitCode = 1;
const baseUrl = "http://localhost:3210";
const webServer = Bun.spawn({
  cmd: [
    process.execPath,
    "node_modules/next/dist/bin/next",
    "dev",
    "-p",
    "3210",
  ],
  cwd: webRoot,
  env: childEnvironment,
  stderr: "inherit",
  stdout: "inherit",
});

async function available(url: string) {
  try {
    return (await fetch(`${url}/register/sponsor`)).ok;
  } catch {
    return false;
  }
}

try {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (webServer.exitCode !== null) {
      throw new Error(
        `Next.js development server exited with ${webServer.exitCode}.`,
      );
    }

    if (await available(baseUrl)) break;
    if (attempt === 119) {
      throw new Error("Next.js development server did not become ready.");
    }
    await Bun.sleep(250);
  }
  childEnvironment.KAFIL_E2E_BASE_URL = baseUrl;

  const tests = Bun.spawn({
    cmd: [
      "bunx",
      "playwright",
      "test",
      "test/e2e/dev-form-fill.e2e.ts",
    ],
    cwd: webRoot,
    env: childEnvironment,
    stderr: "inherit",
    stdout: "inherit",
  });
  exitCode = await tests.exited;
} finally {
  webServer.kill();
}

process.exit(exitCode);
