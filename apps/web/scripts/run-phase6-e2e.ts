import { preparePhase6BrowserUsers } from "./setup-phase6-e2e";
import { removePhase6BrowserUsers } from "./teardown-phase6-e2e";
import { pool } from "@kafil/server/database";
import { resolve } from "node:path";

const useProductionServer = Bun.env.KAFIL_E2E_USE_PRODUCTION === "1";
const baseUrl = "http://127.0.0.1:3210";

const phase6E2eEnvironment = {
  ...process.env,
  DATABASE_URL: Bun.env.DATABASE_URL,
  EMAIL_DEFAULT_FROM: Bun.env.EMAIL_DEFAULT_FROM,
  EMAIL_LOG_LEVEL: Bun.env.EMAIL_LOG_LEVEL,
  EMAIL_PROVIDER: Bun.env.EMAIL_PROVIDER,
  JWT_ACCESS_SECRET: Bun.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: Bun.env.JWT_REFRESH_SECRET,
  KAFIL_ADMIN_EMAIL: Bun.env.KAFIL_ADMIN_EMAIL,
  KAFIL_ADMIN_PASSWORD: Bun.env.KAFIL_ADMIN_PASSWORD,
  NAJM_ENCRYPTION_KEY: Bun.env.NAJM_ENCRYPTION_KEY,
  NAJM_AUTH_INTERNAL_URL: `${baseUrl}/api/auth/session/recover`,
  KAFIL_E2E_BASE_URL: baseUrl,
};

const childOptions = {
  env: {
    ...phase6E2eEnvironment,
    KAFIL_E2E_MANAGED_SERVER: "1",
  },
  stderr: "inherit",
  stdout: "inherit",
} as const;

let testExitCode = 1;
let webServer: ReturnType<typeof Bun.spawn> | undefined;

async function waitForWebServer(server: ReturnType<typeof Bun.spawn>) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js E2E server exited with code ${server.exitCode}.`);
    }
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await Bun.sleep(250);
  }
  throw new Error("Next.js E2E server did not become ready within 30 seconds.");
}

try {
  await preparePhase6BrowserUsers();
  webServer = Bun.spawn({
    cmd: useProductionServer
      ? [
          process.execPath,
          "node_modules/next/dist/bin/next",
          "start",
          "-p",
          "3210",
        ]
      : [
          process.execPath,
          "node_modules/next/dist/bin/next",
          "dev",
          "-p",
          "3210",
        ],
    cwd: resolve(import.meta.dir, ".."),
    ...childOptions,
  });
  await waitForWebServer(webServer);

  const testCommand = [
      "bunx",
      "playwright",
      "test",
      "test/e2e/phase6-closeout.e2e.ts",
      "test/e2e/phase7-unified-flow.e2e.ts",
      "test/e2e/family-create-wizard.e2e.ts",
      "test/e2e/funding-cap-and-catalog-delete.e2e.ts",
      "test/e2e/image-delivery.e2e.ts",
  ];
  if (Bun.env.KAFIL_E2E_GREP) {
    testCommand.push("--grep", Bun.env.KAFIL_E2E_GREP);
  }

  const tests = Bun.spawn({
    cmd: testCommand,
    ...childOptions,
  });
  testExitCode = await tests.exited;
} finally {
  webServer?.kill();
  try {
    await removePhase6BrowserUsers();
  } catch (error) {
    console.error("Could not remove Phase 6 browser users.", error);
    if (testExitCode === 0) testExitCode = 1;
  }
  await pool.end();
}

process.exit(testExitCode);
