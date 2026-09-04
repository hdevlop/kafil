import { describe, expect, test } from "bun:test";

import { NAJM_TIME_ZONES } from "najm-kit/server";
import { kafilI18n, kafilLocales } from "@kafil/server/locales";

import { POST as postLanguage } from "@/app/api/ui-language/route";
import { POST as postTheme } from "@/app/api/ui-theme/route";
import { POST as postTimeZone } from "@/app/api/ui-timezone/route";
import { kafilPreferences } from "@/lib/preferences";

/**
 * Kafil's *configuration*, not Najm's behavior.
 *
 * Validation, normalization, cookie serialization, and 400 handling are
 * covered by `najm-kit`'s own suite. What matters here is that Kafil supplies
 * the four things it owns — its catalog, Casablanca, the published cookie
 * names, and MAD — and inherits everything else untouched.
 */

const cookies = (values: Record<string, string>) => ({
  get: (name: string) => (name in values ? { value: values[name]! } : undefined),
});

const post = (path: string, body: unknown) =>
  new Request(`https://kafil.test/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const malformedPost = (path: string) =>
  new Request(`https://kafil.test/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });

const routeCases = [
  {
    name: "language",
    path: "ui-language",
    field: "language",
    valid: "ar",
    invalid: "klingon",
    cookie: "kafil-ui-language=ar",
    handler: postLanguage,
  },
  {
    name: "theme",
    path: "ui-theme",
    field: "theme",
    valid: "dark",
    invalid: "high-contrast",
    cookie: "kafil-ui-theme=dark",
    handler: postTheme,
  },
  {
    name: "time zone",
    path: "ui-timezone",
    field: "timeZone",
    valid: "Europe/Paris",
    invalid: "Mars/Olympus",
    cookie: "kafil-ui-timezone=Europe/Paris",
    handler: postTimeZone,
  },
] as const;

describe("Kafil preference configuration", () => {
  test("keeps the deployed cookie names so existing sessions do not lose preferences", () => {
    expect(kafilPreferences.cookieNames).toEqual({
      language: "kafil-ui-language",
      theme: "kafil-ui-theme",
      timeZone: "kafil-ui-timezone",
    });
  });

  test("inherits Najm's secure cookie options without restating them", () => {
    expect(kafilPreferences.cookieOptions).toEqual({
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  });

  test("defaults to Casablanca and light, and to the catalog's own default language", () => {
    expect(kafilPreferences.defaultTimeZone).toBe("Africa/Casablanca");
    expect(kafilPreferences.defaultTheme).toBe("light");
    expect(kafilPreferences.defaultLanguage).toBe(kafilI18n.defaultLanguage);
  });

  test("accepts the shared Najm zones rather than a Kafil-owned allow-list", () => {
    // The same published constant `TimeZoneInput` builds its options from, not
    // a copy. The old 12-zone list rejected zones the control offered.
    expect(kafilPreferences.timeZones).toEqual([...NAJM_TIME_ZONES]);
    expect(kafilPreferences.timeZones).toContain("Asia/Riyadh");
    expect(kafilPreferences.timeZones).toContain("Africa/Nairobi");
    expect(kafilPreferences.timeZones).toContain("Asia/Dubai");
  });

  test("locale metadata still maps every language to its Moroccan tag", () => {
    expect(kafilLocales).toEqual({ ar: "ar-MA", en: "en-MA", es: "es-MA", fr: "fr-MA" });
  });
});

describe("Kafil preference endpoints", () => {
  test("every zone the shared input offers is accepted and cookied", async () => {
    for (const zone of NAJM_TIME_ZONES) {
      const response = await postTimeZone(post("ui-timezone", { timeZone: zone }));

      expect(response.status, zone).toBe(200);
      expect(await response.json()).toEqual({ timeZone: zone });
      expect(response.headers.get("set-cookie")).toContain(`kafil-ui-timezone=${zone}`);
    }
  });

  test("each route module returns its response body and exact compatibility cookie", async () => {
    for (const { name, path, field, valid, cookie: pair, handler } of routeCases) {
      const response = await handler(post(path, { [field]: valid }));
      const cookie = response.headers.get("set-cookie");

      expect(response.status, name).toBe(200);
      expect(await response.json(), name).toEqual({ [field]: valid });
      expect(cookie, name).toBe(`${pair}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`);
    }
  });

  test("every route rejects an unsupported value without writing a cookie", async () => {
    for (const { name, path, field, invalid, handler } of routeCases) {
      const response = await handler(post(path, { [field]: invalid }));
      expect(response.status).toBe(400);
      expect(response.headers.get("set-cookie"), name).toBeNull();
    }
  });

  test("every route treats malformed JSON as a cookie-free 400", async () => {
    for (const { name, path, handler } of routeCases) {
      const response = await handler(malformedPost(path));
      expect(response.status, name).toBe(400);
      expect(response.headers.get("set-cookie"), name).toBeNull();
    }
  });
});

describe("Kafil root-layout resolution", () => {
  test("resolves the product defaults for a first visit", () => {
    expect(kafilPreferences.resolve(cookies({}))).toEqual({
      language: "en",
      theme: "light",
      timeZone: "Africa/Casablanca",
    });
  });

  test("prefers the cookie, then the session language, then the catalog default", () => {
    expect(
      kafilPreferences.resolve(cookies({ "kafil-ui-language": "fr" }), { languageFallback: "ar" })
        .language,
    ).toBe("fr");
    expect(kafilPreferences.resolve(cookies({}), { languageFallback: "ar" }).language).toBe("ar");
    expect(kafilPreferences.resolve(cookies({}), { languageFallback: "klingon" }).language).toBe(
      "en",
    );
  });

  test("reads back the theme and time zone the endpoints wrote", () => {
    expect(
      kafilPreferences.resolve(
        cookies({ "kafil-ui-theme": "dark", "kafil-ui-timezone": "Asia/Riyadh" }),
      ),
    ).toEqual({ language: "en", theme: "dark", timeZone: "Asia/Riyadh" });
  });

  test("a stale or invalid cookie falls back instead of pinning the UI", () => {
    expect(
      kafilPreferences.resolve(
        cookies({ "kafil-ui-theme": "sepia", "kafil-ui-timezone": "Mars/Olympus" }),
      ),
    ).toEqual({ language: "en", theme: "light", timeZone: "Africa/Casablanca" });
  });
});
