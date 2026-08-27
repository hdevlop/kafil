import { describe, expect, test } from "bun:test";

import { ensureLogoutCookiesCleared } from "../src/lib/authLogoutResponse";

const setCookiesOf = (response: Response) =>
  (response.headers as Headers & { getSetCookie(): string[] }).getSetCookie();

describe("auth logout response", () => {
  test("guarantees value-free expiry for both Najm auth cookies", () => {
    const request = new Request("https://app.test/api/auth/logout", {
      method: "POST",
    });
    const original = Response.json({ success: true });

    const cookies = setCookiesOf(ensureLogoutCookiesCleared(request, original));

    for (const name of ["refreshToken", "najm.session"]) {
      const deletion = cookies.find((cookie) => cookie.startsWith(`${name}=`));
      expect(deletion).toBeDefined();
      expect(deletion).toContain(`${name}=;`);
      expect(deletion).toContain("Path=/");
      expect(deletion).toContain("HttpOnly");
      expect(deletion).toContain("SameSite=Lax");
      expect(deletion).toContain("Secure");
      expect(deletion).toContain("Max-Age=0");
    }
  });

  test("leaves non-logout and failed logout responses untouched", () => {
    const loginResponse = Response.json({ success: true });
    const failedLogoutResponse = Response.json(
      { success: false },
      { status: 401 },
    );

    expect(
      ensureLogoutCookiesCleared(
        new Request("https://app.test/api/auth/login", { method: "POST" }),
        loginResponse,
      ),
    ).toBe(loginResponse);
    expect(
      ensureLogoutCookiesCleared(
        new Request("https://app.test/api/auth/logout", { method: "POST" }),
        failedLogoutResponse,
      ),
    ).toBe(failedLogoutResponse);
  });

  test("omits Secure over HTTP and preserves the wrapped response", async () => {
    const headers = new Headers({
      "content-type": "application/json",
      "x-auth-contract": "preserved",
    });
    headers.append("set-cookie", "unrelated=kept; Path=/");
    const original = new Response(JSON.stringify({ success: true }), {
      headers,
      status: 201,
      statusText: "Created",
    });

    const result = ensureLogoutCookiesCleared(
      new Request("http://127.0.0.1:3210/api/auth/logout", { method: "POST" }),
      original,
    );

    expect(result.status).toBe(201);
    expect(result.statusText).toBe("Created");
    expect(result.headers.get("x-auth-contract")).toBe("preserved");
    expect(await result.json()).toEqual({ success: true });
    expect(setCookiesOf(result)).toContain("unrelated=kept; Path=/");
    expect(
      setCookiesOf(result)
        .filter((cookie) => /^(refreshToken|najm\.session)=/.test(cookie))
        .every((cookie) => !cookie.includes("Secure")),
    ).toBe(true);
  });
});
