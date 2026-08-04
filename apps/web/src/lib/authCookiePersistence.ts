const AUTH_COOKIE_NAMES = new Set(["refreshToken", "najm.session"]);
const REMEMBER_COOKIE_NAME = "kafil.remember";
const REMEMBER_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

type AuthCookieMode = "persistent" | "session";

type AuthCookieAction =
  | { mode: AuthCookieMode; type: "apply" }
  | { type: "clear" }
  | { type: "setup" }
  | null;

type RequestHandler = (request: Request) => Promise<Response>;

function cookieValue(header: string, name: string) {
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim();
  }

  return undefined;
}

function cookieName(setCookie: string) {
  const separator = setCookie.indexOf("=");
  return separator < 0 ? "" : setCookie.slice(0, separator).trim();
}

export function makeSessionCookie(setCookie: string) {
  if (!AUTH_COOKIE_NAMES.has(cookieName(setCookie))) return setCookie;

  return setCookie
    .split(";")
    .filter((part) => !/^\s*(?:expires|max-age)=/i.test(part))
    .join(";");
}

function preferenceCookie(
  mode: AuthCookieMode,
  secure: boolean,
) {
  const attributes = [
    `${REMEMBER_COOKIE_NAME}=${mode === "persistent" ? "1" : "0"}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (secure) attributes.push("Secure");
  if (mode === "persistent") {
    attributes.push(`Max-Age=${REMEMBER_MAX_AGE_SECONDS}`);
  }

  return attributes.join("; ");
}

function clearedPreferenceCookie(secure: boolean) {
  return [
    `${REMEMBER_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
    "Max-Age=0",
  ].join("; ");
}

async function resolveAction(request: Request): Promise<AuthCookieAction> {
  const pathname = new URL(request.url).pathname;

  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/access/login"
  ) {
    const body = (await request.clone().json().catch(() => null)) as {
      rememberMe?: unknown;
    } | null;
    return {
      type: "apply",
      mode: body?.rememberMe === true ? "persistent" : "session",
    };
  }

  if (
    pathname === "/api/auth/logout" ||
    pathname === "/api/access/family-password/change"
  ) {
    return { type: "clear" };
  }

  if (
    pathname === "/api/auth/refresh" ||
    pathname === "/api/auth/session/recover"
  ) {
    const remembered = cookieValue(
      request.headers.get("cookie") ?? "",
      REMEMBER_COOKIE_NAME,
    );
    if (remembered === "0") return { type: "apply", mode: "session" };
    if (remembered === "1") return { type: "apply", mode: "persistent" };
  }

  return null;
}

function isDeletionCookie(setCookie: string) {
  if (/^[^=]+=\s*(?:;|$)/.test(setCookie)) return true;
  if (/(?:^|;)\s*max-age=0(?:;|$)/i.test(setCookie)) return true;

  const expires = /(?:^|;)\s*expires=([^;]+)/i.exec(setCookie)?.[1];
  return expires ? new Date(expires).getTime() <= Date.now() : false;
}

async function getAccessFlowResponse(response: Response) {
  const payload = (await response.clone().json().catch(() => null)) as
    | {
        data?: { nextStep?: unknown; setupRequired?: unknown };
        nextStep?: unknown;
        setupRequired?: unknown;
      }
    | null;
  return payload?.data ?? payload;
}

function applyAction(
  response: Response,
  action: Exclude<AuthCookieAction, null>,
  secure: boolean,
) {
  const headers = new Headers(response.headers);
  const setCookies = (
    headers as Headers & { getSetCookie(): string[] }
  ).getSetCookie();
  headers.delete("set-cookie");

  for (const setCookie of setCookies) {
    if (
      action.type === "setup" &&
      AUTH_COOKIE_NAMES.has(cookieName(setCookie)) &&
      !isDeletionCookie(setCookie)
    ) {
      continue;
    }

    headers.append(
      "set-cookie",
      action.type === "apply" && action.mode === "session"
        ? makeSessionCookie(setCookie)
        : setCookie,
    );
  }

  headers.append(
    "set-cookie",
    action.type === "clear" || action.type === "setup"
      ? clearedPreferenceCookie(secure)
      : preferenceCookie(action.mode, secure),
  );

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function withAuthCookiePersistence(handler: RequestHandler): RequestHandler {
  return async (request) => {
    let action = await resolveAction(request);
    const response = await handler(request);

    if (!response.ok) return response;

    const flow = await getAccessFlowResponse(response);

    if (
      action?.type === "apply" &&
      (flow?.setupRequired === true ||
        flow?.nextStep === "family_password_setup")
    ) {
      action = { type: "setup" };
    }

    if (!action) return response;

    return applyAction(
      response,
      action,
      new URL(request.url).protocol === "https:",
    );
  };
}
