import { createRequire } from "node:module";

const requireFromServer = createRequire(
  new URL("../../../../packages/server/package.json", import.meta.url),
);
const { Client } = requireFromServer("pg");

function value(name) {
  const current = process.env[name];
  return current && current.length > 0 ? current : undefined;
}

function isLoopback(host) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function isMailboxLoopback() {
  try {
    return isLoopback(new URL(value("KAFIL_E2E_MAILBOX_API_URL")).hostname);
  } catch {
    return false;
  }
}

const checks = [
  ["DATABASE_CONFIGURATION_PRESENT", Boolean(value("DATABASE_URL"))],
  [
    "DATABASE_MODE_AUTHORIZED",
    ["authorized_local_demo", "existing-local-demo", "dedicated_disposable"].includes(
      value("KAFIL_E2E_DATABASE_MODE"),
    ),
  ],
  [
    "DATABASE_AUTHORIZED_OVERLAY",
    value("KAFIL_E2E_ALLOW_DEFAULT_DATABASE") === "true",
  ],
  [
    "ADMIN_CREDENTIALS_PRESENT",
    Boolean(value("KAFIL_ADMIN_EMAIL")) && Boolean(value("KAFIL_ADMIN_PASSWORD")),
  ],
  [
    "JWT_SECRETS_PRESENT",
    (value("JWT_ACCESS_SECRET")?.length ?? 0) >= 32 &&
      (value("JWT_REFRESH_SECRET")?.length ?? 0) >= 32,
  ],
  ["ENCRYPTION_SECRET_PRESENT", (value("NAJM_ENCRYPTION_KEY")?.length ?? 0) === 64],
  ["EMAIL_PROVIDER_IS_SMTP", value("EMAIL_PROVIDER") === "smtp"],
  ["SMTP_HOST_IS_LOOPBACK", isLoopback(value("SMTP_HOST"))],
  ["SMTP_PORT_IS_1025", value("SMTP_PORT") === "1025"],
  ["SMTP_SECURE_IS_FALSE", value("SMTP_SECURE") === "false"],
  ["SMTP_CREDENTIALS_ARE_EMPTY", !value("SMTP_USER") && !value("SMTP_PASS")],
  ["MAILBOX_API_IS_LOOPBACK", isMailboxLoopback()],
  [
    "LIVE_EMAIL_DELIVERY_DISABLED",
    !value("KAFIL_E2E_LIVE_EMAIL") && !value("SEND_LIVE_EMAIL"),
  ],
];

const failedChecks = checks.filter(([, ok]) => !ok);
if (failedChecks.length > 0) {
  for (const [name, ok] of checks) {
    console.log(`PREFLIGHT ${ok ? "OK" : "FAIL"} ${name}`);
  }
  process.exitCode = 1;
} else {
  const client = new Client({
    connectionString: value("DATABASE_URL"),
    connectionTimeoutMillis: 1500,
  });
  try {
    await client.connect();
    await client.query("select 1");
    console.log("PREFLIGHT OK acceptance configuration and PostgreSQL query");
  } catch {
    console.error("PREFLIGHT FAIL PostgreSQL readiness query");
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}
