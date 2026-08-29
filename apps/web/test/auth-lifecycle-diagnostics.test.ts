import { describe, expect, test } from "bun:test";

import { consoleErrorFingerprint } from "./e2e/authLifecycleDiagnostics";

describe("remote auth lifecycle console diagnostics", () => {
  test("retains only a bounded HTTP failure classification", () => {
    expect(
      consoleErrorFingerprint(
        "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
        "https://demo.example.invalid/api/auth/me?identity=private",
      ),
    ).toBe("resource-http;status=401;path=/api/auth/me");
  });

  test("does not retain arbitrary console text, query values, or origins", () => {
    const fingerprint = consoleErrorFingerprint(
      "private identity and credential text",
      "https://demo.example.invalid/dashboard?token=private",
    );

    expect(fingerprint).toBe("unclassified;status=none;path=/dashboard");
    expect(fingerprint).not.toContain("private");
    expect(fingerprint).not.toContain("example.invalid");
  });
});
