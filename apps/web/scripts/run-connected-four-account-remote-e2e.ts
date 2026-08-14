/**
 * Guarded black-box runner for the disposable Kafil demo deployment.
 *
 * It never starts Next.js, never connects to PostgreSQL, and never runs seed
 * commands. It owns one SSH tunnel to the loopback-only Mailpit API, validates
 * the exact HTTPS target, and tears down only the tunnel it created.
 */

import { spawn, type Subprocess } from "bun";
import { existsSync } from "node:fs";
import { connect } from "node:net";
import { resolve } from "node:path";

import {
  buildRemotePlaywrightArgs,
  buildSshTunnelArgs,
  mailboxAuthorization,
  readRemoteAcceptanceConfig,
  remoteAcceptanceChecks,
  type RemoteAcceptanceConfig,
} from "./connected-four-account-remote-runtime";

const preflightOnly = Bun.argv.slice(2).includes("--preflight-only");
const unexpectedArguments = Bun.argv
  .slice(2)
  .filter((argument) => argument !== "--preflight-only");

function readEnv(name: string): string | undefined {
  const value = Bun.env[name]?.trim();
  return value ? value : undefined;
}

function assertArguments(): void {
  if (unexpectedArguments.length > 0) {
    throw new Error("Remote acceptance received an unsupported command argument.");
  }
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

async function isLoopbackPortListening(port: number): Promise<boolean> {
  return await new Promise((resolveListening) => {
    const socket = connect({ host: "127.0.0.1", port });
    let settled = false;
    const finish = (listening: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolveListening(listening);
    };
    socket.setTimeout(750);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function waitForMailbox(
  config: RemoteAcceptanceConfig,
  tunnel: Subprocess,
): Promise<void> {
  const authorization = mailboxAuthorization(config);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (tunnel.exitCode !== null) {
      throw new Error("Managed SSH tunnel exited before Mailpit readiness.");
    }
    try {
      const unauthenticated = await fetch(`${config.mailboxApiUrl}/api/v1/info`);
      const authenticated = await fetch(`${config.mailboxApiUrl}/api/v1/messages?limit=1`, {
        headers: { Authorization: authorization },
      });
      if (unauthenticated.status === 401 && authenticated.status === 200) {
        const payload = (await authenticated.json()) as { messages?: unknown };
        if (Array.isArray(payload.messages)) return;
      }
    } catch {
      // The tunnel or Mailpit is still becoming ready.
    }
    await Bun.sleep(250);
  }
  throw new Error("Authenticated Mailpit API did not become ready through the managed tunnel.");
}

async function assertRemoteEndpoint(config: RemoteAcceptanceConfig, path: string): Promise<void> {
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
    KAFIL_E2E_MAILBOX_USER: config.mailboxUser,
    KAFIL_E2E_MAILBOX_PASSWORD: config.mailboxPassword,
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

async function closeTunnel(tunnel: Subprocess | undefined): Promise<void> {
  if (!tunnel || tunnel.exitCode !== null) return;
  tunnel.kill();
  await Promise.race([tunnel.exited, Bun.sleep(3_000)]);
  if (tunnel.exitCode === null) tunnel.kill(9);
}

let tunnel: Subprocess | undefined;
let exitCode = 1;

try {
  assertArguments();
  const checks = remoteAcceptanceChecks(Bun.env);
  for (const check of checks) {
    console.log(`BOOLEAN ${check.ok ? "OK" : "FAIL"} ${check.name}`);
  }
  const config = readRemoteAcceptanceConfig(Bun.env);

  if (config.sshIdentityFile && !existsSync(config.sshIdentityFile)) {
    throw new Error("Configured SSH identity file does not exist.");
  }
  console.log("PREFLIGHT OK SSH identity configuration");

  const chromeExecutable = findSystemChrome();
  if (!chromeExecutable) {
    throw new Error("System Google Chrome was not found for remote Playwright.");
  }
  console.log("PREFLIGHT OK system Chrome present");

  if (await isLoopbackPortListening(config.mailboxLocalPort)) {
    throw new Error("Remote Mailpit local forwarding port is already in use.");
  }
  console.log("PREFLIGHT OK Mailpit local forwarding port free");

  tunnel = spawn({
    cmd: ["ssh", ...buildSshTunnelArgs(config)],
    stderr: "ignore",
    stdout: "ignore",
  });
  await waitForMailbox(config, tunnel);
  console.log("PREFLIGHT OK managed SSH tunnel and authenticated Mailpit API");

  for (const path of ["/login", "/apply", "/api/system/health", "/api/system/readiness"]) {
    await assertRemoteEndpoint(config, path);
    console.log(`PREFLIGHT OK remote ${path}`);
  }

  if (preflightOnly) {
    console.log("PREFLIGHT PASS remote connected acceptance");
    exitCode = 0;
  } else {
    const testProcess = spawn({
      cmd: [process.execPath, "x", ...buildRemotePlaywrightArgs(config.grep)],
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
  await closeTunnel(tunnel);
  console.log("MANAGED SSH TUNNEL CLOSED");
}

process.exit(exitCode);
