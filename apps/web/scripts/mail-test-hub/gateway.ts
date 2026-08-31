import { createHash, timingSafeEqual } from "node:crypto";

type Environment = Record<string, string | undefined>;
export type MailTestUpstreamFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface MailTestAppScope {
  id: string;
  token: string;
  recipientDomains: string[];
}

export interface MailTestGatewayConfig {
  mailpitUrl: string;
  mailpitAuthorization: string;
  apps: MailTestAppScope[];
}

interface MailpitMessageSummary {
  ID?: unknown;
  [key: string]: unknown;
}

interface MailpitMessage {
  To?: unknown;
  [key: string]: unknown;
}

const APP_ID_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;
const DOMAIN_PATTERN = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const MESSAGE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;
const MAX_QUERY_LENGTH = 320;
const MAX_DELETE_IDS = 100;

function required(env: Environment, name: string): string {
  const result = env[name]?.trim() ?? "";
  if (!result) throw new Error(`${name} is required.`);
  return result;
}

function parseMailpitUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("MAIL_TEST_GATEWAY_MAILPIT_URL must be an HTTP URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error("MAIL_TEST_GATEWAY_MAILPIT_URL must be an HTTP origin.");
  }
  return url.origin;
}

function parseApps(raw: string): MailTestAppScope[] {
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    throw new Error("MAIL_TEST_GATEWAY_APPS_JSON must be valid JSON.");
  }
  if (!Array.isArray(candidate) || candidate.length === 0) {
    throw new Error("MAIL_TEST_GATEWAY_APPS_JSON must contain at least one app.");
  }

  const apps: MailTestAppScope[] = [];
  const ids = new Set<string>();
  const tokens = new Set<string>();
  for (const entry of candidate) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Every mail-test app must be an object.");
    }
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const token = typeof record.token === "string" ? record.token.trim() : "";
    const recipientDomains = Array.isArray(record.recipientDomains)
      ? record.recipientDomains.map((domain) =>
          typeof domain === "string" ? domain.trim().toLowerCase() : "",
        )
      : [];

    if (!APP_ID_PATTERN.test(id)) {
      throw new Error("Every mail-test app id must use lowercase letters, digits, or hyphens.");
    }
    if (token.length < 32) {
      throw new Error("Every mail-test app token must be at least 32 characters.");
    }
    if (ids.has(id) || tokens.has(token)) {
      throw new Error("Mail-test app ids and tokens must be unique.");
    }
    if (
      recipientDomains.length === 0 ||
      new Set(recipientDomains).size !== recipientDomains.length ||
      recipientDomains.some((domain) => !DOMAIN_PATTERN.test(domain))
    ) {
      throw new Error("Every mail-test app needs distinct valid recipient domains.");
    }

    ids.add(id);
    tokens.add(token);
    apps.push({ id, token, recipientDomains });
  }
  return apps;
}

export function parseMailTestGatewayConfig(env: Environment): MailTestGatewayConfig {
  const mailpitUrl = parseMailpitUrl(
    required(env, "MAIL_TEST_GATEWAY_MAILPIT_URL"),
  );
  const mailpitUser = required(env, "MAIL_TEST_GATEWAY_MAILPIT_USER");
  const mailpitPassword = required(env, "MAIL_TEST_GATEWAY_MAILPIT_PASSWORD");
  const apps = parseApps(required(env, "MAIL_TEST_GATEWAY_APPS_JSON"));
  return {
    mailpitUrl,
    mailpitAuthorization: `Basic ${Buffer.from(`${mailpitUser}:${mailpitPassword}`).toString("base64")}`,
    apps,
  };
}

function tokenDigest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function authenticatedScope(
  request: Request,
  config: MailTestGatewayConfig,
): MailTestAppScope | undefined {
  const authorization = request.headers.get("Authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) return undefined;
  const supplied = tokenDigest(match[1]!);
  return config.apps.find((app) =>
    timingSafeEqual(supplied, tokenDigest(app.token)),
  );
}

function responseHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  return headers;
}

function json(payload: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return Response.json(payload, {
    status,
    headers: responseHeaders(extraHeaders),
  });
}

function failure(status: number, code: string): Response {
  const headers = status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined;
  return json({ error: code }, status, headers);
}

function upstreamHeaders(config: MailTestGatewayConfig): Headers {
  return new Headers({
    Accept: "application/json",
    Authorization: config.mailpitAuthorization,
  });
}

function messageIdFromPath(pathname: string): string | undefined {
  const prefix = "/api/v1/message/";
  if (!pathname.startsWith(prefix)) return undefined;
  try {
    const id = decodeURIComponent(pathname.slice(prefix.length));
    return MESSAGE_ID_PATTERN.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

function recipientDomain(address: unknown): string | undefined {
  if (typeof address !== "string") return undefined;
  const separator = address.lastIndexOf("@");
  if (separator <= 0 || separator === address.length - 1) return undefined;
  return address.slice(separator + 1).toLowerCase();
}

function messageBelongsToScope(
  message: MailpitMessage,
  scope: MailTestAppScope,
): boolean {
  if (!Array.isArray(message.To) || message.To.length === 0) return false;
  const allowed = new Set(scope.recipientDomains);
  return message.To.every((destination) => {
    if (!destination || typeof destination !== "object") return false;
    const domain = recipientDomain(
      (destination as Record<string, unknown>).Address,
    );
    return Boolean(domain && allowed.has(domain));
  });
}

function queryRecipient(query: string): string | undefined {
  if (!query || query.length > MAX_QUERY_LENGTH || /[\r\n\0]/.test(query)) {
    return undefined;
  }
  const match = /^to:([^\s"]+)(?:\s+subject:"([^"\r\n]{1,160})")?$/.exec(query);
  return match?.[1]?.toLowerCase();
}

function scopeAllowsQuery(scope: MailTestAppScope, query: string): boolean {
  const recipient = queryRecipient(query);
  if (!recipient) return false;
  const domain = recipient.includes("@")
    ? recipientDomain(recipient)
    : recipient;
  return Boolean(domain && scope.recipientDomains.includes(domain));
}

async function readUpstreamMessage(
  config: MailTestGatewayConfig,
  upstreamFetch: MailTestUpstreamFetch,
  id: string,
): Promise<
  | { kind: "ok"; message: MailpitMessage }
  | { kind: "missing" }
  | { kind: "failed" }
> {
  const url = new URL(`/api/v1/message/${encodeURIComponent(id)}`, config.mailpitUrl);
  let response: Response;
  try {
    response = await upstreamFetch(url.toString(), {
      headers: upstreamHeaders(config),
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return { kind: "failed" };
  }
  if (response.status === 404) return { kind: "missing" };
  if (!response.ok) return { kind: "failed" };
  try {
    const message = (await response.json()) as MailpitMessage;
    return { kind: "ok", message };
  } catch {
    return { kind: "failed" };
  }
}

async function handleInfo(
  config: MailTestGatewayConfig,
  scope: MailTestAppScope,
  upstreamFetch: MailTestUpstreamFetch,
): Promise<Response> {
  try {
    const upstream = await upstreamFetch(
      new URL("/api/v1/info", config.mailpitUrl).toString(),
      {
        headers: upstreamHeaders(config),
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!upstream.ok) return failure(503, "mailbox_unavailable");
  } catch {
    return failure(503, "mailbox_unavailable");
  }
  return json({ service: "mail-test-gateway", app: scope.id });
}

async function handleSearch(
  requestUrl: URL,
  config: MailTestGatewayConfig,
  scope: MailTestAppScope,
  upstreamFetch: MailTestUpstreamFetch,
): Promise<Response> {
  if ([...requestUrl.searchParams.keys()].some((key) => key !== "query")) {
    return failure(400, "invalid_search");
  }
  const query = requestUrl.searchParams.get("query") ?? "";
  if (!queryRecipient(query)) return failure(400, "invalid_search");
  if (!scopeAllowsQuery(scope, query)) return failure(403, "recipient_scope_denied");

  const upstreamUrl = new URL("/api/v1/search", config.mailpitUrl);
  upstreamUrl.searchParams.set("query", query);
  let upstream: Response;
  try {
    upstream = await upstreamFetch(upstreamUrl.toString(), {
      headers: upstreamHeaders(config),
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return failure(503, "mailbox_unavailable");
  }
  if (!upstream.ok) return failure(502, "mailbox_search_failed");

  let payload: Record<string, unknown>;
  try {
    payload = (await upstream.json()) as Record<string, unknown>;
  } catch {
    return failure(502, "mailbox_response_invalid");
  }
  const summaries = Array.isArray(payload.messages)
    ? (payload.messages as MailpitMessageSummary[])
    : [];
  const filtered: MailpitMessageSummary[] = [];
  for (const summary of summaries) {
    if (typeof summary.ID !== "string" || !MESSAGE_ID_PATTERN.test(summary.ID)) {
      continue;
    }
    const detail = await readUpstreamMessage(config, upstreamFetch, summary.ID);
    if (detail.kind === "failed") return failure(502, "mailbox_detail_failed");
    if (
      detail.kind === "ok" &&
      messageBelongsToScope(detail.message, scope)
    ) {
      filtered.push(summary);
    }
  }
  return json({ ...payload, total: filtered.length, messages: filtered });
}

async function handleDetail(
  id: string,
  config: MailTestGatewayConfig,
  scope: MailTestAppScope,
  upstreamFetch: MailTestUpstreamFetch,
): Promise<Response> {
  const result = await readUpstreamMessage(config, upstreamFetch, id);
  if (result.kind === "failed") return failure(502, "mailbox_detail_failed");
  if (
    result.kind === "missing" ||
    !messageBelongsToScope(result.message, scope)
  ) {
    return failure(404, "message_not_found");
  }
  return json(result.message);
}

async function handleDelete(
  request: Request,
  config: MailTestGatewayConfig,
  scope: MailTestAppScope,
  upstreamFetch: MailTestUpstreamFetch,
): Promise<Response> {
  let payload: unknown;
  try {
    const body = await request.text();
    if (body.length > 16_384) return failure(413, "request_too_large");
    payload = JSON.parse(body);
  } catch {
    return failure(400, "invalid_delete");
  }
  const ids =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).IDs
      : undefined;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_DELETE_IDS ||
    ids.some((id) => typeof id !== "string" || !MESSAGE_ID_PATTERN.test(id)) ||
    new Set(ids).size !== ids.length
  ) {
    return failure(400, "invalid_delete");
  }

  for (const id of ids as string[]) {
    const result = await readUpstreamMessage(config, upstreamFetch, id);
    if (result.kind === "failed") return failure(502, "mailbox_detail_failed");
    if (
      result.kind === "missing" ||
      !messageBelongsToScope(result.message, scope)
    ) {
      return failure(404, "message_not_found");
    }
  }

  let upstream: Response;
  try {
    const headers = upstreamHeaders(config);
    headers.set("Content-Type", "application/json");
    upstream = await upstreamFetch(
      new URL("/api/v1/messages", config.mailpitUrl).toString(),
      {
        method: "DELETE",
        headers,
        body: JSON.stringify({ IDs: ids }),
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      },
    );
  } catch {
    return failure(503, "mailbox_unavailable");
  }
  if (!upstream.ok) return failure(502, "mailbox_delete_failed");
  const contentType = upstream.headers.get("Content-Type") ?? "application/json";
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: responseHeaders({ "Content-Type": contentType }),
  });
}

export function createMailTestGateway(
  config: MailTestGatewayConfig,
  upstreamFetch: MailTestUpstreamFetch = (input, init) => fetch(input, init),
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const scope = authenticatedScope(request, config);
    if (!scope) return failure(401, "authentication_required");

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/v1/info") {
      return await handleInfo(config, scope, upstreamFetch);
    }
    if (request.method === "GET" && url.pathname === "/api/v1/search") {
      return await handleSearch(url, config, scope, upstreamFetch);
    }
    if (request.method === "GET") {
      const id = messageIdFromPath(url.pathname);
      if (id) return await handleDetail(id, config, scope, upstreamFetch);
    }
    if (request.method === "DELETE" && url.pathname === "/api/v1/messages") {
      return await handleDelete(request, config, scope, upstreamFetch);
    }
    return failure(404, "route_not_found");
  };
}
