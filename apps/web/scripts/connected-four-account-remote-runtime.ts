export const REMOTE_ACCEPTANCE_ORIGIN = "https://kafala360.ma";

export const REMOTE_GREP_MAX_LENGTH = 200;

type Environment = Record<string, string | undefined>;

export interface RemoteAcceptanceCheck {
  name: string;
  ok: boolean;
}

export interface RemoteAcceptanceConfig {
  remoteUrl: string;
  adminEmail: string;
  adminPassword: string;
  mailboxApiHost: string;
  mailboxApiUrl: string;
  mailboxToken: string;
  grep?: string;
}

function value(env: Environment, name: string): string {
  return env[name]?.trim() ?? "";
}

function readBoundedGrep(
  env: Environment,
  name: "KAFIL_E2E_REMOTE_GREP" | "KAFIL_E2E_REMOTE_AUTH_GREP",
): string | undefined {
  const raw = env[name]?.trim();
  if (!raw) return undefined;
  if (/[\r\n\0]/.test(raw)) {
    throw new Error(`${name} must be one single-line pattern.`);
  }
  if (raw.length > REMOTE_GREP_MAX_LENGTH) {
    throw new Error(
      `${name} exceeds the ${REMOTE_GREP_MAX_LENGTH}-character maximum.`,
    );
  }
  return raw;
}

export function readRemoteGrep(env: Environment): string | undefined {
  return readBoundedGrep(env, "KAFIL_E2E_REMOTE_GREP");
}

export function readRemoteAuthGrep(env: Environment): string | undefined {
  return readBoundedGrep(env, "KAFIL_E2E_REMOTE_AUTH_GREP");
}

function isConnectionReset(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return false;
    const candidate = current as { cause?: unknown; code?: unknown };
    if (candidate.code === "ECONNRESET") return true;
    current = candidate.cause;
  }
  return false;
}

export async function retryReadAfterConnectionReset<T>(
  read: () => Promise<T>,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!isConnectionReset(error)) throw error;
    return await read();
  }
}

export function handleConcurrentPromise<T>(promise: Promise<T>): Promise<T> {
  void promise.catch(() => undefined);
  return promise;
}

function exactRemoteUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.origin === REMOTE_ACCEPTANCE_ORIGIN &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === "" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

function mailboxApiHost(raw: string): boolean {
  const labels = raw.split(".");
  return raw === raw.toLowerCase() &&
    raw.length <= 253 &&
    labels.length >= 2 &&
    labels.every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    ) &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(raw) &&
    !raw.endsWith(".ts.net");
}

function exactMailboxApiUrl(raw: string, expectedHost: string): boolean {
  if (!mailboxApiHost(expectedHost)) return false;
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      url.hostname === expectedHost &&
      url.port === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === "" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

const LEGACY_TRANSPORT_NAMES = [
  "KAFIL_E2E_SSH_HOST",
  "KAFIL_E2E_SSH_USER",
  "KAFIL_E2E_SSH_PORT",
  "KAFIL_E2E_SSH_IDENTITY_FILE",
  "KAFIL_E2E_SSH_PASSWORD",
  "KAFIL_E2E_MAILBOX_LOCAL_PORT",
  "KAFIL_E2E_MAILBOX_REMOTE_PORT",
  "KAFIL_E2E_MAILBOX_PRIVATE_HOST",
  "KAFIL_E2E_TAILSCALE_DISCONNECT_AFTER",
] as const;

export function remoteAcceptanceChecks(env: Environment): RemoteAcceptanceCheck[] {
  const expectedMailboxApiHost = value(env, "KAFIL_E2E_MAILBOX_API_HOST");
  return [
    {
      name: "REMOTE_URL_EXACT",
      ok: exactRemoteUrl(value(env, "KAFIL_E2E_REMOTE_URL")),
    },
    {
      name: "REMOTE_DESTRUCTIVE_AUTHORIZED",
      ok: value(env, "KAFIL_E2E_ALLOW_REMOTE_DESTRUCTIVE") === "true",
    },
    {
      name: "ADMIN_CREDENTIALS_PRESENT",
      ok: Boolean(value(env, "KAFIL_ADMIN_EMAIL")) && Boolean(value(env, "KAFIL_ADMIN_PASSWORD")),
    },
    {
      name: "LEGACY_MANAGED_TRANSPORT_CONFIG_ABSENT",
      ok: LEGACY_TRANSPORT_NAMES.every((name) => !value(env, name)),
    },
    {
      name: "MAILBOX_API_HOST_VALID",
      ok: mailboxApiHost(expectedMailboxApiHost),
    },
    {
      name: "MAILBOX_API_HTTPS_EXACT",
      ok: exactMailboxApiUrl(
        value(env, "KAFIL_E2E_MAILBOX_API_URL"),
        expectedMailboxApiHost,
      ),
    },
    {
      name: "MAILBOX_APP_TOKEN_STRONG",
      ok: value(env, "KAFIL_E2E_MAILBOX_TOKEN").length >= 32,
    },
  ];
}

export function readRemoteAcceptanceConfig(env: Environment): RemoteAcceptanceConfig {
  const checks = remoteAcceptanceChecks(env);
  const failures = checks.filter((check) => !check.ok);
  if (failures.length > 0) {
    throw new Error(
      `Refusing remote acceptance because ${failures.length} boolean contract(s) failed.`,
    );
  }

  return {
    remoteUrl: REMOTE_ACCEPTANCE_ORIGIN,
    adminEmail: value(env, "KAFIL_ADMIN_EMAIL"),
    adminPassword: value(env, "KAFIL_ADMIN_PASSWORD"),
    mailboxApiHost: value(env, "KAFIL_E2E_MAILBOX_API_HOST"),
    mailboxApiUrl: value(env, "KAFIL_E2E_MAILBOX_API_URL"),
    mailboxToken: value(env, "KAFIL_E2E_MAILBOX_TOKEN"),
    grep: readRemoteGrep(env),
  };
}

export function buildRemotePlaywrightArgs(grep?: string): string[] {
  const args = [
    "playwright",
    "test",
    "test/e2e/connected-four-account.remote.ts",
    "--config",
    "playwright.remote.config.ts",
  ];
  if (grep) args.push("--grep", grep);
  return args;
}

export function buildRemoteAuthPlaywrightArgs(grep?: string): string[] {
  const args = [
    "playwright",
    "test",
    "test/e2e/auth-lifecycle.remote.ts",
    "--config",
    "playwright.remote.config.ts",
  ];
  if (grep) args.push("--grep", grep);
  return args;
}

export function mailboxAuthorization(config: RemoteAcceptanceConfig): string {
  return `Bearer ${config.mailboxToken}`;
}
