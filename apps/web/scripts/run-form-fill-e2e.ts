import { pool } from "@kafil/server/database";
import { readFormFillEnabled } from "@kafil/server/settings-bootstrap";
import { type Subprocess } from "bun";
import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const webRoot = resolve(import.meta.dir, "..");
const baseUrl = "http://127.0.0.1:3210";
const distDirectoryName = ".next-form-fill-e2e";
const distDirectory = resolve(webRoot, distDirectoryName);

if (dirname(distDirectory) !== webRoot) {
  throw new Error("Form-fill acceptance distDir escaped the web workspace.");
}

function readEnv(name: string): string | undefined {
  const value = Bun.env[name]?.trim();
  return value ? value : undefined;
}

function isAuthorizedDatabaseMode(): boolean {
  const mode = readEnv("KAFIL_E2E_DATABASE_MODE");
  return (
    mode === "authorized_local_demo" ||
    mode === "existing-local-demo" ||
    mode === "dedicated_disposable"
  );
}

async function portIsFree(): Promise<boolean> {
  try {
    await fetch(`${baseUrl}/apply`, { signal: AbortSignal.timeout(2_000) });
    return false;
  } catch {
    return true;
  }
}

async function assertRunnerBooleans(): Promise<void> {
  const checks: Array<{ name: string; ok: boolean }> = [
    {
      name: "DATABASE_CONFIGURATION_PRESENT",
      ok: Boolean(readEnv("DATABASE_URL")),
    },
    { name: "DATABASE_MODE_AUTHORIZED", ok: isAuthorizedDatabaseMode() },
    {
      name: "DATABASE_AUTHORIZED_OVERLAY",
      ok: readEnv("KAFIL_E2E_ALLOW_DEFAULT_DATABASE") === "true",
    },
    {
      name: "ADMIN_CREDENTIALS_PRESENT",
      ok:
        Boolean(readEnv("KAFIL_ADMIN_EMAIL")) &&
        Boolean(readEnv("KAFIL_ADMIN_PASSWORD")),
    },
    {
      name: "JWT_SECRETS_PRESENT",
      ok:
        (readEnv("JWT_ACCESS_SECRET")?.length ?? 0) >= 32 &&
        (readEnv("JWT_REFRESH_SECRET")?.length ?? 0) >= 32,
    },
    {
      name: "ENCRYPTION_SECRET_PRESENT",
      ok: (readEnv("NAJM_ENCRYPTION_KEY")?.length ?? 0) === 64,
    },
    { name: "ACCEPTANCE_PORT_FREE", ok: await portIsFree() },
  ];

  for (const check of checks) {
    console.log(`BOOLEAN ${check.ok ? "OK" : "FAIL"} ${check.name}`);
  }

  const failures = checks.filter((check) => !check.ok);
  if (failures.length > 0) {
    throw new Error(
      `Refusing to run form-fill acceptance: ${failures.length} boolean contract(s) failed.`,
    );
  }

  await readFormFillEnabled();
  console.log("BOOLEAN OK PLATFORM_SETTINGS_ROW_READABLE");
}

async function available(url: string) {
  try {
    return (await fetch(`${url}/apply`)).ok;
  } catch {
    return false;
  }
}

const childEnvironment: Record<string, string | undefined> = {
  ...process.env,
  KAFIL_E2E_BASE_URL: baseUrl,
  KAFIL_E2E_MANAGED_SERVER: "1",
  NAJM_NEXT_DIST_DIR: distDirectoryName,
};

let exitCode = 1;
let webServer: Subprocess | undefined;

try {
  await assertRunnerBooleans();
  await rm(distDirectory, { force: true, recursive: true });

  webServer = Bun.spawn({
    cmd: [
      "node",
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
      "-p",
      "3210",
    ],
    cwd: webRoot,
    env: childEnvironment,
    stderr: "inherit",
    stdout: "inherit",
  });

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (webServer.exitCode !== null) {
      throw new Error(
        `Next.js acceptance server exited with ${webServer.exitCode}.`,
      );
    }

    if (await available(baseUrl)) break;
    if (attempt === 119) {
      throw new Error("Next.js acceptance server did not become ready.");
    }
    await Bun.sleep(250);
  }

  for (const path of ["/login", "/api/system/health"]) {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`Next.js prewarm returned ${response.status} for ${path}.`);
    }
  }

  const tests = Bun.spawn({
    cmd: ["bunx", "playwright", "test", "test/e2e/dev-form-fill.e2e.ts"],
    cwd: webRoot,
    env: childEnvironment,
    stderr: "inherit",
    stdout: "inherit",
  });
  exitCode = await tests.exited;
} finally {
  if (webServer) {
    webServer.kill();
    await webServer.exited;
  }
  await pool.end();
  await rm(distDirectory, { force: true, recursive: true });
}

process.exit(exitCode);
