import { afterEach, describe, expect, spyOn, test } from "bun:test";

import { LANGUAGE_HEADER } from "@kafil/contracts/locales";
import { auth } from "../src/najm.auth";
import { api, languageHeaders } from "../src/services/http";

const globals = globalThis as { document?: { documentElement: { lang?: string } } };
const originalDocument = globals.document;
const spies: Array<{ mockRestore(): void }> = [];

afterEach(() => {
  globals.document = originalDocument;
  for (const spy of spies.splice(0)) spy.mockRestore();
});

describe("request language", () => {
  test("names the page's base language from <html lang>", () => {
    expect(languageHeaders({ lang: "fr" })).toEqual({ [LANGUAGE_HEADER]: "fr" });
    expect(languageHeaders({ lang: "ar-MA" })).toEqual({ [LANGUAGE_HEADER]: "ar" });
    expect(languageHeaders({ lang: "ES" })).toEqual({ [LANGUAGE_HEADER]: "es" });
    expect(languageHeaders({ lang: "" })).toEqual({});
    expect(languageHeaders(undefined)).toEqual({});
  });

  test("a page without a language sends no header, leaving request shapes unchanged", async () => {
    const get = spyOn(auth.api, "get").mockResolvedValue({ status: "success", data: [] } as never);
    spies.push(get);
    globals.document = undefined;
    await api.get("/settings");
    expect(get).toHaveBeenCalledWith("/settings");
  });

  test("every API request carries the language the page shows when it starts", async () => {
    const sent: Array<{ path: string; headers?: Record<string, string> }> = [];
    const record = (data: unknown) => (async (path: string, options?: { headers?: Record<string, string> }) => {
      sent.push({ path, headers: options?.headers });
      return { status: "success", data };
    }) as never;
    spies.push(
      spyOn(auth.api, "get").mockImplementation(record([])),
      spyOn(auth.api, "post").mockImplementation(record({})),
    );

    globals.document = { documentElement: { lang: "fr" } };
    await api.get("/settings");
    globals.document.documentElement.lang = "ar";
    await api.post("/orders", { quantity: 1 });
    await api.getPage("/families");

    expect(sent).toEqual([
      { path: "/settings", headers: { [LANGUAGE_HEADER]: "fr" } },
      { path: "/orders", headers: { [LANGUAGE_HEADER]: "ar" } },
      { path: "/families", headers: { [LANGUAGE_HEADER]: "ar" } },
    ]);
  });
});
