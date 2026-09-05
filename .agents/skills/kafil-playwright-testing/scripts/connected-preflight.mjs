import { createRequire } from "node:module";
import { connect } from "node:net";

const requireFromServer = createRequire(
  new URL("../../../../packages/server/package.json", import.meta.url),
);
const requireFromWeb = createRequire(
  new URL("../../../../apps/web/package.json", import.meta.url),
);
const { Client } = requireFromServer("pg");

const localAcceptanceOverrides = {
  EMAIL_PROVIDER: "smtp",
  KAFIL_E2E_MAILBOX_API_URL: "http://127.0.0.1:8025",
  SMTP_HOST: "127.0.0.1",
  SMTP_PASS: "",
  SMTP_PORT: "1025",
  SMTP_SECURE: "false",
  SMTP_USER: "",
};

function value(name) {
  const current = Object.hasOwn(localAcceptanceOverrides, name)
    ? localAcceptanceOverrides[name]
    : process.env[name];
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

function redisTarget() {
  try {
    const url = new URL(value("REDIS_URL"));
    const port = Number(url.port || "6379");
    if (
      url.protocol !== "redis:" ||
      !isLoopback(url.hostname) ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      return undefined;
    }
    return {
      host: url.hostname,
      password: decodeURIComponent(url.password),
      port,
      username: decodeURIComponent(url.username),
    };
  } catch {
    return undefined;
  }
}

function isRedisLoopback() {
  return Boolean(redisTarget());
}

function isSharpRuntimeLoadable() {
  try {
    const sharp = requireFromWeb("sharp");
    return typeof sharp === "function" && Boolean(sharp.versions?.sharp);
  } catch {
    return false;
  }
}

function redisCommand(parts) {
  const encoded = parts.map((part) => {
    const value = Buffer.from(part);
    return Buffer.concat([
      Buffer.from(`$${value.byteLength}\r\n`),
      value,
      Buffer.from("\r\n"),
    ]);
  });
  return Buffer.concat([
    Buffer.from(`*${encoded.length}\r\n`),
    ...encoded,
  ]);
}

async function probeRedis() {
  const target = redisTarget();
  if (!target) throw new Error("Redis acceptance target is invalid");

  const commands = [];
  if (target.password) {
    commands.push(
      redisCommand(
        target.username
          ? ["AUTH", target.username, target.password]
          : ["AUTH", target.password],
      ),
    );
  }
  commands.push(redisCommand(["PING"]));

  await new Promise((resolve, reject) => {
    const socket = connect({ host: target.host, port: target.port });
    let response = "";
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };

    socket.setEncoding("utf8");
    socket.setTimeout(1500);
    socket.once("connect", () => socket.write(Buffer.concat(commands)));
    socket.on("data", (chunk) => {
      response += chunk;
      if (response.includes("\r\n-") || response.startsWith("-")) {
        finish(new Error("Redis rejected the readiness command"));
      } else if (response.includes("+PONG\r\n")) {
        finish();
      }
    });
    socket.once("error", () => finish(new Error("Redis connection failed")));
    socket.once("timeout", () => finish(new Error("Redis readiness timed out")));
    socket.once("close", () => {
      if (!settled) finish(new Error("Redis closed before PONG"));
    });
  });
}

const checks = [
  ["DATABASE_CONFIGURATION_PRESENT", Boolean(value("DATABASE_URL"))],
  ["REDIS_CONFIGURATION_PRESENT", Boolean(value("REDIS_URL"))],
  ["REDIS_HOST_IS_LOOPBACK", isRedisLoopback()],
  [
    "REDIS_AUTHENTICATION_PRESENT_FOR_PRODUCTION",
    value("KAFIL_E2E_USE_PRODUCTION") !== "1" || Boolean(redisTarget()?.password),
  ],
  ["SHARP_RUNTIME_LOADABLE", isSharpRuntimeLoadable()],
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
    await probeRedis();
    console.log("PREFLIGHT OK acceptance configuration, PostgreSQL query, and Redis PING");
  } catch {
    console.error("PREFLIGHT FAIL PostgreSQL or Redis readiness query");
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}
