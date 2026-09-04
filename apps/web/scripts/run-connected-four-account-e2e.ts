/**
 * Runner for the connected four-account acceptance harness.
 *
 * Lifecycle mirrors `apps/web/scripts/run-phase6-e2e.ts`:
 *   1. Validate fail-closed boolean contracts (database mode, SMTP, mailbox API, secrets)
 *   2. Boot a Next.js server on 127.0.0.1:3210 (dev unless KAFIL_E2E_USE_PRODUCTION=1)
 *   3. Wait for `/login` to return 200
 *   4. Run only `connected-four-account.e2e.ts` via the project-installed Playwright
 *   5. Tear down the server and the database pool in `finally`
 *   6. Return the real Playwright exit code
 *
 * This runner never prepares the Phase 6 browser users and never reuses the
 * Phase 6 password. Run-bound secrets are generated in memory and forwarded
 * to the Playwright child process through the environment allowlist below;
 * they are stripped before this process exits.
 */

import { spawn, type Subprocess } from "bun";
import { resolve } from "node:path";

const localAcceptanceOverrides: Readonly<Record<string, string>> = {
  EMAIL_PROVIDER: "smtp",
  KAFIL_E2E_MAILBOX_API_URL: "http://127.0.0.1:8025",
  SMTP_HOST: "127.0.0.1",
  SMTP_PASS: "",
  SMTP_PORT: "1025",
  SMTP_SECURE: "false",
  SMTP_USER: "",
};
const useProductionServer = Bun.env.KAFIL_E2E_USE_PRODUCTION === "1";
const baseUrl = "http://127.0.0.1:3210";

function readEnv(name: string): string | undefined {
  const value = Object.hasOwn(localAcceptanceOverrides, name)
    ? localAcceptanceOverrides[name]
    : Bun.env[name];
  return value && value.length > 0 ? value : undefined;
}

function isLoopbackHost(host: string | undefined): boolean {
  if (!host) return false;
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function isAuthorizedDatabaseMode(): boolean {
  const mode = readEnv("KAFIL_E2E_DATABASE_MODE");
  if (!mode) return false;
  // Plan §5 authorizes both the canonical literal and the existing-repository
  // literal that the pretest surfaced. Both names signal the same authorization.
  return (
    mode === "authorized_local_demo" ||
    mode === "existing-local-demo" ||
    mode === "dedicated_disposable"
  );
}

function assertRunnerBooleans(): void {
  const checks: Array<{ name: string; ok: boolean }> = [
    { name: "DATABASE_CONFIGURATION_PRESENT", ok: Boolean(readEnv("DATABASE_URL")) },
    { name: "DATABASE_MODE_AUTHORIZED", ok: isAuthorizedDatabaseMode() },
    {
      name: "DATABASE_AUTHORIZED_OVERLAY",
      ok: readEnv("KAFIL_E2E_ALLOW_DEFAULT_DATABASE") === "true",
    },
    { name: "ADMIN_CREDENTIALS_PRESENT", ok: Boolean(readEnv("KAFIL_ADMIN_EMAIL")) && Boolean(readEnv("KAFIL_ADMIN_PASSWORD")) },
    { name: "JWT_SECRETS_PRESENT", ok: (readEnv("JWT_ACCESS_SECRET")?.length ?? 0) >= 32 && (readEnv("JWT_REFRESH_SECRET")?.length ?? 0) >= 32 },
    { name: "ENCRYPTION_SECRET_PRESENT", ok: (readEnv("NAJM_ENCRYPTION_KEY")?.length ?? 0) === 64 },
    { name: "EMAIL_PROVIDER_IS_SMTP", ok: readEnv("EMAIL_PROVIDER") === "smtp" },
    { name: "SMTP_HOST_IS_LOOPBACK", ok: isLoopbackHost(readEnv("SMTP_HOST")) },
    { name: "SMTP_PORT_IS_1025", ok: readEnv("SMTP_PORT") === "1025" },
    { name: "SMTP_SECURE_IS_FALSE", ok: readEnv("SMTP_SECURE") === "false" },
    { name: "SMTP_CREDENTIALS_ARE_EMPTY", ok: !readEnv("SMTP_USER") && !readEnv("SMTP_PASS") },
    {
      name: "MAILBOX_API_IS_LOOPBACK",
      ok: (() => {
        const raw = readEnv("KAFIL_E2E_MAILBOX_API_URL");
        if (!raw) return false;
        try {
          const host = new URL(raw).hostname;
          return isLoopbackHost(host);
        } catch {
          return false;
        }
      })(),
    },
    {
      name: "LIVE_EMAIL_DELIVERY_DISABLED",
      ok: !readEnv("KAFIL_E2E_LIVE_EMAIL") && !readEnv("SEND_LIVE_EMAIL"),
    },
  ];

  for (const check of checks) {
    console.log(`BOOLEAN ${check.ok ? "OK" : "FAIL"} ${check.name}`);
  }

  const failures = checks.filter((check) => !check.ok);
  if (failures.length > 0) {
    throw new Error(
      `Refusing to run connected acceptance — ${failures.length} boolean contract(s) failed.`,
    );
  }
}

const serverEnvAllowlist = {
  DATABASE_URL: readEnv("DATABASE_URL"),
  EMAIL_DEFAULT_FROM: readEnv("EMAIL_DEFAULT_FROM"),
  EMAIL_LOG_LEVEL: readEnv("EMAIL_LOG_LEVEL"),
  EMAIL_PROVIDER: readEnv("EMAIL_PROVIDER"),
  JWT_ACCESS_SECRET: readEnv("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: readEnv("JWT_REFRESH_SECRET"),
  KAFIL_ADMIN_EMAIL: readEnv("KAFIL_ADMIN_EMAIL"),
  KAFIL_ADMIN_PASSWORD: readEnv("KAFIL_ADMIN_PASSWORD"),
  NAJM_ENCRYPTION_KEY: readEnv("NAJM_ENCRYPTION_KEY"),
  NAJM_AUTH_INTERNAL_URL: `${baseUrl}/api/auth/session/recover`,
  NAJM_AUTH_LOGIN_RATE_LIMIT_ENABLED: readEnv("NAJM_AUTH_LOGIN_RATE_LIMIT_ENABLED"),
  NAJM_AUTH_LOGIN_RATE_LIMIT: readEnv("NAJM_AUTH_LOGIN_RATE_LIMIT"),
  NAJM_AUTH_LOGIN_RATE_WINDOW: readEnv("NAJM_AUTH_LOGIN_RATE_WINDOW"),
  KAFIL_E2E_BASE_URL: baseUrl,
  KAFIL_E2E_USE_PRODUCTION: useProductionServer ? "1" : "0",
  KAFIL_E2E_MANAGED_SERVER: "1",
  NAJM_NEXT_DIST_DIR: ".next-connected-acceptance-webpack",
  KAFIL_E2E_DATABASE_MODE: readEnv("KAFIL_E2E_DATABASE_MODE"),
  KAFIL_E2E_ALLOW_DEFAULT_DATABASE: readEnv("KAFIL_E2E_ALLOW_DEFAULT_DATABASE"),
  KAFIL_E2E_MAILBOX_API_URL: readEnv("KAFIL_E2E_MAILBOX_API_URL"),
  SMTP_HOST: readEnv("SMTP_HOST"),
  SMTP_PORT: readEnv("SMTP_PORT"),
  SMTP_SECURE: readEnv("SMTP_SECURE"),
  SMTP_USER: readEnv("SMTP_USER"),
  SMTP_PASS: readEnv("SMTP_PASS"),
};

function generateRuntimeSecret(): string {
  // Must satisfy Kafil's password schema: 8–72 chars, at least one
  // uppercase letter, one lowercase letter, and one digit. We assemble
  // a base alphabet, then guarantee coverage of all three classes plus a
  // symbol before shuffling.
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const specials = "!@#$%^&*";
  const all = uppercase + lowercase + digits;
  let value = "";
  for (let index = 0; index < 12; index += 1) {
    value += all.charAt(Math.floor(Math.random() * all.length));
  }
  value += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  value += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  value += digits.charAt(Math.floor(Math.random() * digits.length));
  value += specials.charAt(Math.floor(Math.random() * specials.length));
  // Fisher–Yates shuffle so the guaranteed-class chars are not always
  // at the end of the string.
  const chars = value.split("");
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const tmp = chars[index]!;
    chars[index] = chars[swap]!;
    chars[swap] = tmp;
  }
  return chars.join("");
}

function buildRunLabel(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear().toString().padStart(4, "0");
  const mm = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = now.getUTCDate().toString().padStart(2, "0");
  const hh = now.getUTCHours().toString().padStart(2, "0");
  const mi = now.getUTCMinutes().toString().padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `c4a-${yyyy}${mm}${dd}-${hh}${mi}-${suffix}`;
}

const familyRuntimePassword = generateRuntimeSecret();
const sponsorARuntimePassword = generateRuntimeSecret();
const sponsorBRuntimePassword = generateRuntimeSecret();
const sponsorAEmail = `c4a-sponsorA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@c4a-sponsor.test`;
const sponsorAPhone = `+2126000${Math.floor(Math.random() * 9000 + 1000)}`;
const familyEmail = `c4a-family-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@c4a-family.test`;
const familyPhone = `+2126222${Math.floor(Math.random() * 9000 + 1000)}`;
const runLabel = buildRunLabel();

const childEnv: Record<string, string> = {
  KAFIL_E2E_RUN_LABEL: runLabel,
  KAFIL_E2E_FAMILY_IDENTIFIER: familyEmail,
  KAFIL_E2E_FAMILY_PHONE: familyPhone,
  KAFIL_E2E_FAMILY_EMAIL: familyEmail,
  KAFIL_E2E_FAMILY_PASSWORD: familyRuntimePassword,
  KAFIL_E2E_SPONSOR_A_EMAIL: sponsorAEmail,
  KAFIL_E2E_SPONSOR_A_PHONE: sponsorAPhone,
  KAFIL_E2E_SPONSOR_A_PASSWORD: sponsorARuntimePassword,
  KAFIL_E2E_SPONSOR_B_PASSWORD: sponsorBRuntimePassword,
};

for (const [key, value] of Object.entries(serverEnvAllowlist)) {
  if (value !== undefined && value !== null && value !== "") {
    childEnv[key] = value as string;
  }
}

async function waitForWebServer(server: Subprocess): Promise<void> {
  let loginReady = false;
  for (let attempt = 0; attempt < 480; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js server exited with code ${server.exitCode} before readiness.`);
    }
    try {
      if (!loginReady) {
        const response = await fetch(`${baseUrl}/login`);
        loginReady = response.ok;
      }
      if (loginReady) {
        const response = await fetch(`${baseUrl}/api/system/health`);
        if (response.status < 500) return;
      }
    } catch {
      // The server is still starting.
    }
    await Bun.sleep(250);
  }
  throw new Error("Next.js connected acceptance server did not become ready within 120 seconds.");
}

let testExitCode = 1;
let webServer: Subprocess | undefined;
const serverOutputTasks: Promise<void>[] = [];

function redactSensitiveQueryValues(value: string): string {
  return value.replace(
    /([?&](?:token|code|otp|password)=)[^&\s]+/giu,
    "$1[REDACTED]",
  );
}

async function forwardSanitizedOutput(
  stream: ReadableStream<Uint8Array>,
  write: (value: string) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      write(redactSensitiveQueryValues(decoder.decode(value, { stream: true })));
    }
    const remainder = decoder.decode();
    if (remainder) write(redactSensitiveQueryValues(remainder));
  } finally {
    reader.releaseLock();
  }
}

try {
  assertRunnerBooleans();

  webServer = spawn({
    cmd: useProductionServer
      ? [
          process.execPath,
          "node_modules/next/dist/bin/next",
          "start",
          "-p",
          "3210",
          "-H",
          "127.0.0.1",
        ]
      : [
          process.execPath,
          "node_modules/next/dist/bin/next",
          "dev",
          "--webpack",
          "-p",
          "3210",
          "-H",
          "127.0.0.1",
        ],
    cwd: resolve(import.meta.dir, ".."),
    env: childEnv,
    stderr: "pipe",
    stdout: "pipe",
  });
  if (
    !(webServer.stdout instanceof ReadableStream) ||
    !(webServer.stderr instanceof ReadableStream)
  ) {
    throw new Error("Next.js server output pipes were not created.");
  }
  serverOutputTasks.push(
    forwardSanitizedOutput(webServer.stdout, (value) => process.stdout.write(value)),
    forwardSanitizedOutput(webServer.stderr, (value) => process.stderr.write(value)),
  );
  await waitForWebServer(webServer);

  const testProcess = spawn({
    cmd: [
      "bunx",
      "playwright",
      "test",
      "test/e2e/connected-four-account.e2e.ts",
      ...(readEnv("KAFIL_E2E_GREP")
        ? ["--grep", readEnv("KAFIL_E2E_GREP")!]
        : []),
    ],
    cwd: resolve(import.meta.dir, ".."),
    env: childEnv,
    stderr: "inherit",
    stdout: "inherit",
  });
  testExitCode = await testProcess.exited;
} finally {
  webServer?.kill();
  await Promise.allSettled(serverOutputTasks);
  for (const key of Object.keys(childEnv)) {
    if (key.startsWith("KAFIL_E2E_") || key.startsWith("SMTP_") || key.startsWith("NAJM_")) {
      // Best-effort scrub of forwarded values for any inspection that survives the
      // process tree; the process exits immediately afterwards anyway.
      delete (Bun.env as Record<string, string | undefined>)[key];
    }
  }
}

process.exit(testExitCode);
