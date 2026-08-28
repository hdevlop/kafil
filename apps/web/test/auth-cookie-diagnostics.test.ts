import { describe, expect, test } from "bun:test";

import {
  describeRecognizedAuthCookies,
  inspectSessionCookieHeaders,
  type AuthCookieWriterEvent,
} from "./e2e/authCookieDiagnostics";

describe("value-free auth cookie diagnostics", () => {
  test("classifies session writes and deletions without retaining values", () => {
    const secretSession = "private-signed-session-value";
    const written = inspectSessionCookieHeaders([
      `najm.session=${secretSession}; Path=/; Domain=.example.test; HttpOnly; Secure`,
      "unrelated=keep-me; Path=/",
    ]);
    const deleted = inspectSessionCookieHeaders([
      "najm.session=; Path=/; HttpOnly; Secure; Max-Age=0",
    ]);

    expect(written).toEqual([
      {
        action: "set",
        domain: ".example.test",
        path: "/",
      },
    ]);
    expect(deleted).toEqual([
      {
        action: "delete",
        domain: "host-only",
        path: "/",
      },
    ]);
    expect(JSON.stringify({ written, deleted })).not.toContain(secretSession);
    expect(JSON.stringify({ written, deleted })).not.toContain("keep-me");
  });

  test("reports only recognized cookie kinds and scopes", () => {
    const snapshot = describeRecognizedAuthCookies([
      { name: "refreshToken", value: "private-refresh", domain: "example.test", path: "/" },
      { name: "najm.session", value: "private-session", domain: ".example.test", path: "/app" },
      { name: "theme", value: "dark", domain: "example.test", path: "/" },
    ]);

    expect(snapshot).toEqual([
      { kind: "refresh", domain: "example.test", path: "/" },
      { kind: "session", domain: ".example.test", path: "/app" },
    ]);
    expect(JSON.stringify(snapshot)).not.toContain("private-");
    expect(JSON.stringify(snapshot)).not.toContain("theme");
  });

  test("writer events have only the approved value-free fields", () => {
    const event: AuthCookieWriterEvent = {
      order: 1,
      method: "GET",
      path: "/dashboard",
      status: 200,
      sessionAction: "set",
      sessionDomain: "host-only",
      sessionPath: "/",
    };

    expect(Object.keys(event).sort()).toEqual([
      "method",
      "order",
      "path",
      "sessionAction",
      "sessionDomain",
      "sessionPath",
      "status",
    ]);
  });
});
