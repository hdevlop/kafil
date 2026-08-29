import { describe, expect, test } from "bun:test";

import {
  isDisposableAuthFamily,
  isDisposableAuthSponsor,
  isDisposableAuthSponsorRecipient,
} from "./e2e/authLifecycleCleanup";

describe("remote auth lifecycle supported cleanup scope", () => {
  test("recognizes only the matrix-reserved Family identity shape", () => {
    expect(isDisposableAuthFamily({
      name: "Auth Family auth-mabcdef-1234abcd",
      email: "auth-mabcdef-1234abcd-family@c4a-family.test",
    })).toBe(true);
    expect(isDisposableAuthFamily({
      name: "Auth Family auth-mabcdef-1234abcd",
      email: "family@example.test",
    })).toBe(false);
  });

  test("recognizes only the matrix-reserved Sponsor identity and recipient shape", () => {
    const email = "auth-mabcdef-1234abcd-sponsora@c4a-sponsor.test";
    expect(isDisposableAuthSponsor({
      name: "Auth Sponsor auth-mabcdef-1234abcd",
      email,
    })).toBe(true);
    expect(isDisposableAuthSponsorRecipient(email)).toBe(true);
    expect(isDisposableAuthSponsorRecipient("sponsor@example.test")).toBe(false);
  });
});
