import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const session = readSource("../src/lib/session.ts");
const authConfig = readSource("../src/lib/auth.ts");
const proxy = readSource("../src/proxy.ts");

describe("the server session boundary is package-owned", () => {
  test("session.ts is one createReactServerAuth singleton", () => {
    expect(session).toContain(
      'import { createReactServerAuth } from "najm-auth/client/server/react"',
    );
    expect(session).toContain("export const serverAuth = createReactServerAuth(auth)");

    // Called once, and at module scope. A second call, or one nested inside a
    // function, would build a separate memoized resolver that shares nothing.
    const calls = session
      .split("\n")
      .filter((line) => line.includes("createReactServerAuth("));
    expect(calls).toEqual(["export const serverAuth = createReactServerAuth(auth);"]);
  });

  test("session.ts keeps the server-only marker", () => {
    expect(session).toStartWith('import "server-only";');
  });

  test("the route-facing named exports survive the migration", () => {
    expect(session).toContain(
      "export const { getSession, requireSession, requireRole } = serverAuth",
    );
  });

  test("no guard logic is reimplemented locally", () => {
    for (const owned of [
      'from "react"', // React.cache
      'from "next/navigation"', // redirect
      "session.roles ??", // role fallback
      "/forbidden",
      "/login",
    ]) {
      expect(session).not.toContain(owned);
    }
  });

  test("redirect targets come from defineAuth, not from a literal", () => {
    expect(authConfig).toContain('loginRoute: "/login"');
    expect(authConfig).toContain('forbiddenRoute: "/forbidden"');
  });
});

describe("the proxy stays free of React-server code", () => {
  test("proxy.ts reaches only the core auth object", () => {
    expect(proxy).toContain('import { auth } from "@/lib/auth"');
    expect(proxy).not.toContain("@/lib/session");
    expect(proxy).not.toContain("client/server/react");
  });

  test("auth.ts imports nothing React-server", () => {
    expect(authConfig).toContain('from "najm-auth/client/server"');
    expect(authConfig).not.toContain("client/server/react");
    expect(authConfig).not.toContain('from "react"');
  });

  test("proxy treats the signed session as an optimistic snapshot", () => {
    expect(authConfig).toContain("verifyAlways: false");
    expect(authConfig).not.toContain("verifyAlways: true");

    // Next.js 16 strips internal Flight headers before Proxy receives the
    // Request. An in-function prefetch detector therefore cannot reliably
    // prevent an older protected response from recovering `najm.session`
    // after logout.
    expect(proxy).not.toContain("next-router-prefetch");
    expect(proxy).not.toContain("next-router-state-tree");
    expect(proxy).toContain("return auth.middleware(request)");
  });
});

describe("every session consumer goes through the shared module", () => {
  const consumers = [
    "../src/app/layout.tsx",
    "../src/app/(auth)/layout.tsx",
    "../src/app/(dashboard)/layout.tsx",
    "../src/app/(dashboard)/dashboard/page.tsx",
    "../src/app/(dashboard)/applicants/page.tsx",
    "../src/app/(dashboard)/users/page.tsx",
    "../src/app/(dashboard)/sponsor/layout.tsx",
  ];

  test("no server boundary resolves a session for itself", () => {
    const offenders = consumers.filter((path) => {
      const source = readSource(path);
      // `auth.getSession()` and friends bypass the request cache, so a layout
      // or page calling them pays for its own cookie verification and recovery.
      return /\bauth\.(getSession|requireSession|requireRole)\s*\(/.test(source);
    });

    expect(offenders).toEqual([]);
  });

  test("each consumer imports from @/lib/session", () => {
    const missing = consumers.filter(
      (path) => !readSource(path).includes('from "@/lib/session"'),
    );

    expect(missing).toEqual([]);
  });
});
