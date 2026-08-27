import { describe, expect, test } from "bun:test";
import { withAuthCookiePersistence } from "najm-auth/client/server";

const setCookiesOf = (response: Response) =>
  (response.headers as Headers & { getSetCookie(): string[] }).getSetCookie();

describe("Kafil Najm auth-cookie integration", () => {
  test("the installed wrapper owns successful logout cookie deletion", async () => {
    const handler = withAuthCookiePersistence(
      async () => {
        const headers = new Headers();
        headers.append(
          "set-cookie",
          "refreshToken=stale; Path=/; HttpOnly; Max-Age=604800",
        );
        headers.append("set-cookie", "unrelated=kept; Path=/");
        return Response.json({ success: true }, { headers });
      },
      { rememberCookieName: "kafil.remember" },
    );

    const cookies = setCookiesOf(
      await handler(
        new Request("https://app.test/api/auth/logout", { method: "POST" }),
      ),
    );

    for (const name of ["refreshToken", "najm.session"]) {
      const matching = cookies.filter((cookie) =>
        cookie.startsWith(`${name}=`),
      );
      expect(matching).toHaveLength(1);
      expect(matching[0]).toContain(`${name}=;`);
      expect(matching[0]).toContain("Max-Age=0");
    }
    expect(cookies.find((cookie) => cookie.startsWith("kafil.remember="))).toContain(
      "Max-Age=0",
    );
    expect(cookies).toContain("unrelated=kept; Path=/");
  });
});
