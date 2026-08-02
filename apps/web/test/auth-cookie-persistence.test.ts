import { describe, expect, test } from "bun:test";

import { withAuthCookiePersistence } from "../src/lib/authCookiePersistence";

const getSetCookies = (response: Response) =>
  (
    response.headers as Headers & { getSetCookie(): string[] }
  ).getSetCookie();

function authResponse() {
  const headers = new Headers();
  headers.append(
    "set-cookie",
    "refreshToken=refresh; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax",
  );
  headers.append(
    "set-cookie",
    "najm.session=session; Max-Age=300; Path=/; HttpOnly; SameSite=Lax",
  );
  return new Response("{}", { headers, status: 200 });
}

const handler = withAuthCookiePersistence(async () => authResponse());

describe("auth cookie persistence", () => {
  test("keeps the Kafil access-login request at its public boundary", async () => {
    let forwardedPathname = "";
    let forwardedBody: unknown;
    const routedHandler = withAuthCookiePersistence(async (request) => {
      forwardedPathname = new URL(request.url).pathname;
      forwardedBody = await request.json();
      return authResponse();
    });

    await routedHandler(
      new Request("https://kafil.test/api/access/login", {
        body: JSON.stringify({
          identifier: "+212600000000",
          password: "ab123456",
          rememberMe: false,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(forwardedPathname).toBe("/api/access/login");
    expect(forwardedBody).toEqual({
      identifier: "+212600000000",
      password: "ab123456",
      rememberMe: false,
    });
  });

  test("uses browser-session cookies when Remember me is unchecked", async () => {
    const response = await handler(
      new Request("https://kafil.test/api/auth/login", {
        body: JSON.stringify({
          identifier: "family@example.test",
          password: "Password1",
          rememberMe: false,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const cookies = getSetCookies(response);

    expect(cookies).toHaveLength(3);
    expect(cookies[0]).not.toMatch(/(?:expires|max-age)=/i);
    expect(cookies[1]).not.toMatch(/(?:expires|max-age)=/i);
    expect(cookies[2]).toContain("kafil.remember=0");
    expect(cookies[2]).not.toMatch(/Max-Age=/i);
    expect(cookies[2]).toContain("Secure");
  });

  test("returns only a browser-session setup cookie for a temporary-CIN login", async () => {
    const setupHandler = withAuthCookiePersistence(async () => {
      const headers = new Headers(authResponse().headers);
      headers.append(
        "set-cookie",
        "kafil.family-setup=opaque; Path=/; HttpOnly; SameSite=Strict",
      );
      headers.append(
        "set-cookie",
        "refreshToken=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
      );
      headers.append(
        "set-cookie",
        "najm.session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
      );
      return Response.json(
        {
          data: { setupRequired: true, expiresAt: "soon" },
          status: "success",
        },
        { headers },
      );
    });

    const response = await setupHandler(
      new Request("https://kafil.test/api/access/login", {
        body: JSON.stringify({
          identifier: "+212600000000",
          password: "ab123456",
          rememberMe: true,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const cookies = getSetCookies(response);

    expect(cookies.some((cookie) => cookie.includes("refreshToken=refresh"))).toBe(false);
    expect(cookies.some((cookie) => cookie.includes("najm.session=session"))).toBe(false);
    expect(cookies.some((cookie) => cookie.includes("kafil.family-setup=opaque"))).toBe(true);
    expect(
      cookies.find((cookie) => cookie.includes("kafil.family-setup=opaque")),
    ).not.toMatch(/(?:expires|max-age)=/i);
    expect(cookies.some((cookie) => cookie.includes("refreshToken=") && cookie.includes("Max-Age=0"))).toBe(true);
    expect(cookies.some((cookie) => cookie.includes("najm.session=") && cookie.includes("Max-Age=0"))).toBe(true);
    expect(cookies.at(-1)).toContain("kafil.remember=");
    expect(cookies.at(-1)).toContain("Max-Age=0");
  });

  test("returns only the scoped OTP cookie for a pending sponsor login", async () => {
    const otpHandler = withAuthCookiePersistence(async () => {
      const headers = new Headers(authResponse().headers);
      headers.append(
        "set-cookie",
        "kafil.sponsor-email-otp=opaque; Path=/; HttpOnly; SameSite=Strict",
      );
      headers.append("set-cookie", "refreshToken=; Max-Age=0; Path=/; HttpOnly");
      headers.append("set-cookie", "najm.session=; Max-Age=0; Path=/; HttpOnly");
      return Response.json({
        data: { nextStep: "sponsor_email_otp", maskedDestination: "s***@e***.test" },
      }, { headers });
    });

    const response = await otpHandler(new Request(
      "https://kafil.test/api/access/login",
      {
        body: JSON.stringify({
          identifier: "sponsor@example.test",
          password: "Password1",
          rememberMe: true,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    ));
    const cookies = getSetCookies(response);
    expect(cookies.some((cookie) => cookie.includes("kafil.sponsor-email-otp=opaque"))).toBe(true);
    expect(cookies.some((cookie) => cookie.includes("refreshToken=refresh"))).toBe(false);
    expect(cookies.some((cookie) => cookie.includes("najm.session=session"))).toBe(false);
    expect(cookies.at(-1)).toContain("kafil.remember=");
    expect(cookies.at(-1)).toContain("Max-Age=0");
  });

  test("applies the server-preserved Remember me choice after OTP confirmation", async () => {
    for (const rememberMe of [false, true]) {
      const confirmHandler = withAuthCookiePersistence(async () => {
        const headers = new Headers(authResponse().headers);
        headers.append("set-cookie", "kafil.sponsor-email-otp=; Max-Age=0; Path=/; HttpOnly");
        return Response.json({
          data: { nextStep: "authenticated", rememberMe },
        }, { headers });
      });
      const response = await confirmHandler(new Request(
        "https://kafil.test/api/access/email-verification/confirm",
        {
          body: JSON.stringify({ code: "123456" }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      ));
      const cookies = getSetCookies(response);
      const refresh = cookies.find((cookie) => cookie.startsWith("refreshToken="));
      expect(refresh).toBeDefined();
      if (rememberMe) {
        expect(refresh).toContain("Max-Age=604800");
        expect(cookies.at(-1)).toContain("kafil.remember=1");
      } else {
        expect(refresh).not.toMatch(/(?:expires|max-age)=/i);
        expect(cookies.at(-1)).toContain("kafil.remember=0");
      }
    }
  });

  test("keeps persistent cookies when Remember me is checked", async () => {
    const response = await handler(
      new Request("https://kafil.test/api/auth/login", {
        body: JSON.stringify({
          identifier: "family@example.test",
          password: "Password1",
          rememberMe: true,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const cookies = getSetCookies(response);

    expect(cookies[0]).toContain("Max-Age=604800");
    expect(cookies[1]).toContain("Max-Age=300");
    expect(cookies[2]).toContain("kafil.remember=1");
    expect(cookies[2]).toContain("Max-Age=604800");
  });

  test("preserves session-only behavior through refresh and recovery", async () => {
    for (const pathname of ["/api/auth/refresh", "/api/auth/session/recover"]) {
      const response = await handler(
        new Request(`https://kafil.test${pathname}`, {
          headers: { cookie: "refreshToken=old; kafil.remember=0" },
          method: "POST",
        }),
      );
      const cookies = getSetCookies(response);

      expect(cookies[0]).not.toMatch(/(?:expires|max-age)=/i);
      expect(cookies[1]).not.toMatch(/(?:expires|max-age)=/i);
      expect(cookies[2]).toContain("kafil.remember=0");
    }
  });

  test("leaves legacy refresh sessions unchanged without a preference", async () => {
    const response = await handler(
      new Request("https://kafil.test/api/auth/refresh", {
        headers: { cookie: "refreshToken=legacy" },
        method: "POST",
      }),
    );

    expect(getSetCookies(response)).toEqual(getSetCookies(authResponse()));
  });

  test("clears the preference on logout", async () => {
    const response = await handler(
      new Request("https://kafil.test/api/auth/logout", { method: "POST" }),
    );
    const cookies = getSetCookies(response);

    expect(cookies.at(-1)).toContain("kafil.remember=");
    expect(cookies.at(-1)).toContain("Max-Age=0");
  });
});
