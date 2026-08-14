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
  sshHost: string;
  sshUser: string;
  sshPort: number;
  sshIdentityFile?: string;
  mailboxLocalPort: number;
  mailboxRemotePort: number;
  mailboxApiUrl: string;
  mailboxUser: string;
  mailboxPassword: string;
  grep?: string;
}

function value(env: Environment, name: string): string {
  return env[name]?.trim() ?? "";
}

export function readRemoteGrep(env: Environment): string | undefined {
  const raw = env.KAFIL_E2E_REMOTE_GREP?.trim();
  if (!raw) return undefined;
  if (/[\r\n\0]/.test(raw)) {
    throw new Error("KAFIL_E2E_REMOTE_GREP must be one single-line pattern.");
  }
  if (raw.length > REMOTE_GREP_MAX_LENGTH) {
    throw new Error(
      `KAFIL_E2E_REMOTE_GREP exceeds the ${REMOTE_GREP_MAX_LENGTH}-character maximum.`,
    );
  }
  return raw;
}

function port(env: Environment, name: string): number {
  return Number(value(env, name));
}

function validPort(candidate: number): boolean {
  return Number.isInteger(candidate) && candidate >= 1 && candidate <= 65_535;
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

function exactMailboxUrl(raw: string, localPort: number): boolean {
  if (!validPort(localPort)) return false;
  try {
    const url = new URL(raw);
    return (
      url.protocol === "http:" &&
      url.hostname === "127.0.0.1" &&
      url.port === String(localPort) &&
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

export function remoteAcceptanceChecks(env: Environment): RemoteAcceptanceCheck[] {
  const localPort = port(env, "KAFIL_E2E_MAILBOX_LOCAL_PORT");
  const remotePort = port(env, "KAFIL_E2E_MAILBOX_REMOTE_PORT");
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
    { name: "SSH_HOST_PRESENT", ok: Boolean(value(env, "KAFIL_E2E_SSH_HOST")) },
    {
      name: "SSH_USER_PRESENT",
      ok: /^\S+$/.test(value(env, "KAFIL_E2E_SSH_USER")),
    },
    { name: "SSH_PORT_VALID", ok: validPort(port(env, "KAFIL_E2E_SSH_PORT")) },
    {
      name: "SSH_PASSWORD_ABSENT",
      ok: !value(env, "KAFIL_E2E_SSH_PASSWORD"),
    },
    { name: "MAILBOX_LOCAL_PORT_VALID", ok: validPort(localPort) },
    { name: "MAILBOX_REMOTE_PORT_VALID", ok: validPort(remotePort) },
    {
      name: "MAILBOX_API_LOOPBACK_EXACT",
      ok: exactMailboxUrl(value(env, "KAFIL_E2E_MAILBOX_API_URL"), localPort),
    },
    {
      name: "MAILBOX_CREDENTIALS_PRESENT",
      ok:
        Boolean(value(env, "KAFIL_E2E_MAILBOX_USER")) &&
        Boolean(value(env, "KAFIL_E2E_MAILBOX_PASSWORD")),
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

  const identityFile = value(env, "KAFIL_E2E_SSH_IDENTITY_FILE");
  return {
    remoteUrl: REMOTE_ACCEPTANCE_ORIGIN,
    adminEmail: value(env, "KAFIL_ADMIN_EMAIL"),
    adminPassword: value(env, "KAFIL_ADMIN_PASSWORD"),
    sshHost: value(env, "KAFIL_E2E_SSH_HOST"),
    sshUser: value(env, "KAFIL_E2E_SSH_USER"),
    sshPort: port(env, "KAFIL_E2E_SSH_PORT"),
    sshIdentityFile: identityFile || undefined,
    mailboxLocalPort: port(env, "KAFIL_E2E_MAILBOX_LOCAL_PORT"),
    mailboxRemotePort: port(env, "KAFIL_E2E_MAILBOX_REMOTE_PORT"),
    mailboxApiUrl: value(env, "KAFIL_E2E_MAILBOX_API_URL"),
    mailboxUser: value(env, "KAFIL_E2E_MAILBOX_USER"),
    mailboxPassword: value(env, "KAFIL_E2E_MAILBOX_PASSWORD"),
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

export function buildSshTunnelArgs(config: RemoteAcceptanceConfig): string[] {
  const args = [
    "-N",
    "-T",
    "-o",
    "BatchMode=yes",
    "-o",
    "ExitOnForwardFailure=yes",
    "-o",
    "StrictHostKeyChecking=yes",
    "-o",
    "ConnectTimeout=10",
    "-o",
    "ServerAliveInterval=15",
    "-o",
    "ServerAliveCountMax=2",
    "-p",
    String(config.sshPort),
    "-L",
    `${config.mailboxLocalPort}:127.0.0.1:${config.mailboxRemotePort}`,
  ];
  if (config.sshIdentityFile) args.push("-i", config.sshIdentityFile);
  args.push(`${config.sshUser}@${config.sshHost}`);
  return args;
}

export function mailboxAuthorization(config: RemoteAcceptanceConfig): string {
  return `Basic ${Buffer.from(`${config.mailboxUser}:${config.mailboxPassword}`).toString("base64")}`;
}
