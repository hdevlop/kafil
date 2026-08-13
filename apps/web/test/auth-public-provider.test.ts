import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("public auth page provider boundaries", () => {
  test("loads the protected form-fill setting only for an authenticated session", () => {
    const provider = readSource("../src/providers/AppProviders.tsx");

    expect(provider).toContain(
      'import { AuthProvider, useAuth } from "najm-auth/client/react";',
    );
    expect(provider).toContain("const { isAuthenticated } = useAuth();");
    expect(provider).toContain("enabled: isAuthenticated,");
  });

  test("submits password reset through the real form instead of an external button", () => {
    const reset = readSource(
      "../src/features/Auth/components/ResetPasswordForm.tsx",
    );
    const formStart = reset.indexOf("<NForm");
    const submitButton = reset.indexOf('<NButton', formStart);
    const formEnd = reset.indexOf("</NForm>", formStart);

    expect(formStart).toBeGreaterThanOrEqual(0);
    expect(submitButton).toBeGreaterThan(formStart);
    expect(submitButton).toBeLessThan(formEnd);
    expect(reset).not.toContain('form="reset-password-form"');
  });
});
