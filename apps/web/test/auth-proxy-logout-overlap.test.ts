import { afterEach, describe, expect, test } from "bun:test";
import { withAuthMiddleware } from "najm-auth/client/server";

const SESSION_COOKIE = "najm.session";
const SESSION_SECRET = "kafil-auth-overlap-session-secret";
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

interface SessionClaims {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  roles: string[];
  permissions: string[];
  sessionVersion: number;
  iat: number;
}

function base64Url(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let result = "";

  for (let offset = 0; offset < bytes.length; offset += 3) {
    const first = bytes[offset] ?? 0;
    const second = bytes[offset + 1];
    const third = bytes[offset + 2];
    const chunk = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    result += alphabet[(chunk >> 18) & 63];
    result += alphabet[(chunk >> 12) & 63];
    if (second !== undefined) result += alphabet[(chunk >> 6) & 63];
    if (third !== undefined) result += alphabet[chunk & 63];
  }

  return result;
}

async function signSession(iat = Date.now()): Promise<string> {
  const claims: SessionClaims = {
    user: {
      id: "synthetic-sponsor",
      email: "synthetic@example.test",
      name: "Synthetic Sponsor",
      role: "sponsor",
    },
    roles: ["sponsor"],
    permissions: [],
    sessionVersion: 0,
    iat,
  };
  const payload = JSON.stringify(claims);
  const bytes = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    bytes.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, bytes.encode(payload)),
  );
  return `${payload}.${base64Url(signature)}`;
}

function middleware(verifyAlways: boolean) {
  return withAuthMiddleware({
    protectedRoutes: ["/sponsor/:path*"],
    publicRoutes: ["/login"],
    loginRoute: "/login",
    sessionSecret: SESSION_SECRET,
    verifyAlways,
  });
}

function protectedRequest(session: string): Request {
  return new Request("https://kafil.example/sponsor", {
    headers: {
      cookie: `refreshToken=synthetic-refresh; ${SESSION_COOKIE}=${encodeURIComponent(session)}`,
    },
  });
}

function sessionDirective(response: Response): string | undefined {
  return (
    response.headers as Headers & { getSetCookie(): string[] }
  )
    .getSetCookie()
    .find((header) => header.startsWith(`${SESSION_COOKIE}=`));
}

function applySessionDirective(
  jar: Set<string>,
  directive: string | undefined,
): void {
  if (!directive) return;
  if (/^najm\.session=\s*(?:;|$)/i.test(directive)) jar.delete(SESSION_COOKIE);
  else jar.add(SESSION_COOKIE);
}

describe("Kafil proxy logout overlap", () => {
  test("a valid optimistic snapshot cannot become a late session writer", async () => {
    const session = await signSession();
    const browserJar = new Set([SESSION_COOKIE]);
    let authoritativeRecoveryCalls = 0;
    globalThis.fetch = (async () => {
      authoritativeRecoveryCalls += 1;
      throw new Error("a valid optimistic snapshot must not recover");
    }) as unknown as typeof fetch;

    const protectedResponse = await middleware(false)(protectedRequest(session));
    expect(protectedResponse.status).toBe(200);
    expect(protectedResponse.headers.get("x-middleware-next")).toBe("1");
    expect(authoritativeRecoveryCalls).toBe(0);

    applySessionDirective(
      browserJar,
      `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; Max-Age=0`,
    );
    applySessionDirective(browserJar, sessionDirective(protectedResponse));

    expect(browserJar.has(SESSION_COOKIE)).toBe(false);
    expect(sessionDirective(protectedResponse)).toBeUndefined();
  });

  test("the authoritative mode demonstrates the former late-writer ordering", async () => {
    const session = await signSession();
    const recoveredSession = await signSession(Date.now() + 1);
    const browserJar = new Set([SESSION_COOKIE]);
    let releaseRecovery!: () => void;
    let reportRecoveryStarted!: () => void;
    const recoveryStarted = new Promise<void>((resolve) => {
      reportRecoveryStarted = resolve;
    });
    const recoveryMayFinish = new Promise<void>((resolve) => {
      releaseRecovery = resolve;
    });

    globalThis.fetch = (async () => {
      reportRecoveryStarted();
      await recoveryMayFinish;
      return new Response(JSON.stringify({ data: { recovered: true } }), {
        status: 200,
        headers: {
          "set-cookie": `${SESSION_COOKIE}=${encodeURIComponent(recoveredSession)}; Path=/; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }) as unknown as typeof fetch;

    const protectedResponsePending = middleware(true)(protectedRequest(session));
    await recoveryStarted;

    // The logout response arrives first and deletes the browser session.
    applySessionDirective(
      browserJar,
      `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; Max-Age=0`,
    );
    expect(browserJar.has(SESSION_COOKIE)).toBe(false);

    // The protected response that started before logout arrives afterward.
    releaseRecovery();
    const protectedResponse = await protectedResponsePending;
    applySessionDirective(browserJar, sessionDirective(protectedResponse));

    expect(browserJar.has(SESSION_COOKIE)).toBe(true);
    expect(sessionDirective(protectedResponse)).toStartWith(`${SESSION_COOKIE}=`);
  });
});
