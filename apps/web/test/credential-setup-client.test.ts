import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";

import { auth } from "../src/lib/auth";
import {
  cancelCredentialSetup,
  getCredentialSetupStatus,
  replaceCredentialSetupPassword,
} from "../src/services/credentialSetupApi";

const spies: Array<{ mockRestore(): void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

// Identifier and CIN normalization, the setup session, and the cookie rewriting
// all moved into najm-auth in AUTH-COOKIE-PLAN.md Move 4 and are covered there.
// What stays Kafil's is which endpoints it calls and how it is wired.
describe("credential setup client", () => {
  test("calls Najm's standard credential-setup endpoints", async () => {
    const get = spyOn(auth.api, "get").mockResolvedValue({
      data: { nextStep: "credential_setup", setupRequired: true },
      status: "success",
    } as never);
    const post = spyOn(auth.api, "post").mockResolvedValue({
      data: { changed: true },
      status: "success",
    } as never);
    spies.push(get, post);

    await getCredentialSetupStatus();
    await replaceCredentialSetupPassword({ newPassword: "fatima2026" });
    await cancelCredentialSetup();

    expect(get.mock.calls[0]?.[0]).toBe("/auth/credential-setup/setup");
    expect(post.mock.calls[0]?.[0]).toBe("/auth/credential-setup/change");
    expect(post.mock.calls[1]?.[0]).toBe("/auth/credential-setup/cancel");
  });

  test("sends no /access/* request from any service client", () => {
    const sources = ["src/services/http.ts", "src/services/credentialSetupApi.ts"]
      .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8"))
      .join("\n");

    expect(sources).not.toContain("/access/");
  });

  test("keeps the remember cookie name across the Najm wrapper", () => {
    const route = readFileSync(
      new URL("../src/app/api/[...route]/route.ts", import.meta.url),
      "utf8",
    );

    // Renaming this silently restores persistent cookies for a browser that
    // still holds kafil.remember=0.
    expect(route).toContain('rememberCookieName: "kafil.remember"');
    expect(route).toContain('from "najm-auth/client/server"');
    expect(route).toContain("ensureLogoutCookiesCleared(");
    expect(route).toContain("await persistentPostHandler(request)");
    expect(route).not.toContain("@/lib/authCookiePersistence");
  });
});
