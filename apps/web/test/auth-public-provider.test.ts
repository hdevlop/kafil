import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("public auth page provider boundaries", () => {
  test("keeps the public form-fill setting live on public forms", () => {
    const provider = readSource("../src/providers/AppProviders.tsx");
    const serverSettings = readSource("../src/lib/serverSettings.ts");

    expect(provider).toContain('import { AuthProvider } from "najm-auth/client/react";');
    expect(provider).toContain("initialData: initialFormFill,");
    expect(provider).not.toContain("enabled: isAuthenticated,");
    expect(serverSettings).toContain(
      '"@kafil/server/settings-bootstrap"',
    );
    expect(serverSettings).not.toContain('import("@kafil/server")');
    expect(serverSettings).toContain("console.warn(");
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
