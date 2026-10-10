import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Controller, Get, ResMsg, Server } from "najm-core";

import { kafilI18n, LANGUAGE_HEADER, UI_LANGUAGE_COOKIE } from "@kafil/contracts/locales";
import { i18nConfig } from "../src/config/i18nConfig";

// The language a server message arrives in, through Kafil's real i18n
// configuration. A refusal is resolved the same way as this success message.

type Language = "en" | "fr" | "ar" | "es";

const RETRIEVED = Object.fromEntries(
  (["en", "fr", "ar", "es"] as const).map((language) => [
    language,
    (kafilI18n.translations[language] as { settings: { success: { retrieved: string } } })
      .settings.success.retrieved,
  ]),
) as Record<Language, string>;

@Controller("/language-probe")
class LanguageProbeController {
  @Get("/")
  @ResMsg("settings.success.retrieved")
  read() {
    return { ok: true };
  }
}

const PORT = 4793;
let server: Server;

beforeAll(async () => {
  server = new Server({ isolated: true, silent: true }).use(i18nConfig()).load(LanguageProbeController);
  await server.listen(PORT);
});

afterAll(async () => {
  await server?.stop();
});

async function probe({ header, cookie, query }: { header?: string; cookie?: string; query?: string } = {}) {
  const headers: Record<string, string> = {};
  if (header !== undefined) headers[LANGUAGE_HEADER] = header;
  if (cookie !== undefined) headers.Cookie = cookie;
  const response = await fetch(`http://localhost:${PORT}/language-probe${query ? `?lang=${query}` : ""}`, { headers });
  const body = (await response.json()) as { message: string };
  return { message: body.message, setCookie: response.headers.get("set-cookie") ?? "" };
}

describe("response language", () => {
  it("has a distinct message in every language", () => {
    expect(new Set(Object.values(RETRIEVED)).size).toBe(4);
  });

  it("follows the page's language header over the interface cookie and the query", async () => {
    expect((await probe({ header: "fr", cookie: `${UI_LANGUAGE_COOKIE}=en`, query: "en" })).message).toBe(RETRIEVED.fr);
    expect((await probe({ header: "ar", cookie: `${UI_LANGUAGE_COOKIE}=es`, query: "en" })).message).toBe(RETRIEVED.ar);
  });

  it("without the header uses the interface-language cookie the web app sets", async () => {
    // What a French page's sign-in or refresh sends: the auth client adds no header.
    expect((await probe({ cookie: `${UI_LANGUAGE_COOKIE}=fr` })).message).toBe(RETRIEVED.fr);
    expect((await probe({ cookie: `${UI_LANGUAGE_COOKIE}=es`, query: "ar" })).message).toBe(RETRIEVED.es);
  });

  it("then the query, then the default language", async () => {
    expect((await probe({ query: "ar" })).message).toBe(RETRIEVED.ar);
    expect((await probe()).message).toBe(RETRIEVED.en);
    // najm-i18n's own `language` cookie, which the web app never sets, is not read.
    expect((await probe({ cookie: "language=fr" })).message).toBe(RETRIEVED.en);
  });

  it("falls through an unsupported header and never writes a language cookie", async () => {
    expect((await probe({ header: "de", cookie: `${UI_LANGUAGE_COOKIE}=fr` })).message).toBe(RETRIEVED.fr);
    for (const language of ["fr", "en", "ar", "es"] as const) {
      const result = await probe({ header: language, cookie: `${UI_LANGUAGE_COOKIE}=en` });
      expect(result.message).toBe(RETRIEVED[language]);
      expect(result.setCookie).not.toContain(UI_LANGUAGE_COOKIE);
      expect(result.setCookie).not.toContain("language=");
    }
  });
});
