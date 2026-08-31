import { spawn } from "bun";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  mailboxAuthorization,
  readRemoteAcceptanceConfig,
  readRemoteGrep,
  remoteAcceptanceChecks,
  type RemoteAcceptanceConfig,
} from "./connected-four-account-remote-runtime";

export interface RemoteAcceptanceRunnerOptions {
  buildPlaywrightArgs: () => string[];
  passLabel: string;
  rejectRemoteGrep?: boolean;
}

function readEnv(name: string): string | undefined {
  const value = Bun.env[name]?.trim();
  return value ? value : undefined;
}

function findSystemChrome(): string | undefined {
  const candidates = [
    readEnv("PROGRAMFILES")
      ? resolve(readEnv("PROGRAMFILES")!, "Google", "Chrome", "Application", "chrome.exe")
      : undefined,
    readEnv("ProgramFiles(x86)")
      ? resolve(readEnv("ProgramFiles(x86)")!, "Google", "Chrome", "Application", "chrome.exe")
      : undefined,
    readEnv("LOCALAPPDATA")
      ? resolve(readEnv("LOCALAPPDATA")!, "Google", "Chrome", "Application", "chrome.exe")
      : undefined,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.find((candidate) => existsSync(candidate));
}

async function waitForMailbox(config: RemoteAcceptanceConfig): Promise<void> {
  const authorization = mailboxAuthorization(config);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const unauthenticated = await fetch(`${config.mailboxApiUrl}/api/v1/info`, {
        signal: AbortSignal.timeout(3_000),
      });
      const authenticated = await fetch(`${config.mailboxApiUrl}/api/v1/info`, {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(3_000),
      });
      if (unauthenticated.status === 401 && authenticated.status === 200) {
        const payload = (await authenticated.json()) as {
          service?: unknown;
          app?: unknown;
        };
        if (payload.service === "mail-test-gateway" && payload.app === "kafil") {
          return;
        }
      }
    } catch {
      // The public HTTPS gateway or its private Mailpit dependency is becoming ready.
    }
    await Bun.sleep(250);
  }
  throw new Error(
    "Authenticated Kafil mail-test gateway did not become ready over verified HTTPS.",
  );
}

async function assertRemoteEndpoint(
  config: RemoteAcceptanceConfig,
  path: string,
): Promise<void> {
  let response: globalThis.Response;
  try {
    response = await fetch(new URL(path, config.remoteUrl), {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(`Remote endpoint ${path} was unreachable with verified TLS.`);
  }
  if (!response.ok || new URL(response.url).origin !== config.remoteUrl) {
    throw new Error(`Remote endpoint ${path} failed its exact-origin readiness contract.`);
  }
}

function childEnvironment(
  config: RemoteAcceptanceConfig,
  chromeExecutable: string,
): Record<string, string> {
  const child: Record<string, string> = {
    KAFIL_E2E_BASE_URL: config.remoteUrl,
    KAFIL_E2E_REMOTE_MODE: "1",
    KAFIL_E2E_CHROME_EXECUTABLE: chromeExecutable,
    KAFIL_ADMIN_EMAIL: config.adminEmail,
    KAFIL_ADMIN_PASSWORD: config.adminPassword,
    KAFIL_E2E_MAILBOX_API_URL: config.mailboxApiUrl,
    KAFIL_E2E_MAILBOX_TOKEN: config.mailboxToken,
  };
  for (const name of [
    "PATH",
    "PATHEXT",
    "SYSTEMROOT",
    "COMSPEC",
    "TEMP",
    "TMP",
    "LOCALAPPDATA",
    "APPDATA",
    "USERPROFILE",
    "PROGRAMFILES",
    "ProgramFiles(x86)",
  ]) {
    const value = readEnv(name);
    if (value) child[name] = value;
  }
  return child;
}

export async function runRemoteAcceptance(
  options: RemoteAcceptanceRunnerOptions,
): Promise<number> {
  const preflightOnly = Bun.argv.slice(2).includes("--preflight-only");
  const unexpectedArguments = Bun.argv
    .slice(2)
    .filter((argument) => argument !== "--preflight-only");
  let exitCode = 1;

  try {
    if (unexpectedArguments.length > 0) {
      throw new Error("Remote acceptance received an unsupported command argument.");
    }
    if (options.rejectRemoteGrep && readRemoteGrep(Bun.env)) {
      throw new Error("Remote auth acceptance does not allow a grep selection.");
    }
    const checks = remoteAcceptanceChecks(Bun.env);
    for (const check of checks) {
      console.log(`BOOLEAN ${check.ok ? "OK" : "FAIL"} ${check.name}`);
    }
    const config = readRemoteAcceptanceConfig(Bun.env);

    const chromeExecutable = findSystemChrome();
    if (!chromeExecutable) {
      throw new Error("System Google Chrome was not found for remote Playwright.");
    }
    console.log("PREFLIGHT OK system Chrome present");

    await waitForMailbox(config);
    console.log("PREFLIGHT OK app-scoped HTTPS mail-test gateway");

    for (const path of ["/login", "/apply", "/api/system/health", "/api/system/readiness"]) {
      await assertRemoteEndpoint(config, path);
      console.log(`PREFLIGHT OK remote ${path}`);
    }

    if (preflightOnly) {
      console.log(`PREFLIGHT PASS ${options.passLabel}`);
      exitCode = 0;
    } else {
      const testProcess = spawn({
        cmd: [process.execPath, "x", ...options.buildPlaywrightArgs()],
        cwd: resolve(import.meta.dir, ".."),
        env: childEnvironment(config, chromeExecutable),
        stderr: "inherit",
        stdout: "inherit",
      });
      exitCode = await testProcess.exited;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Remote acceptance failed.");
    exitCode = 1;
  } finally {
    console.log("NO MANAGED MAILBOX TRANSPORT");
  }

  return exitCode;
}
