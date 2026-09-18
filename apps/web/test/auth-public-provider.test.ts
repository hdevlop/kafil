import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("public auth page provider boundaries", () => {
  test("keeps authentication available on public forms", () => {
    const provider = readSource("../src/providers/AppProviders.tsx");

    expect(provider).toContain("authClient={auth.client}");
    expect(provider).not.toContain("enabled: isAuthenticated,");
  });

  test("uses Najm's single app provider with default Query integration", () => {
    const provider = readSource("../src/providers/AppProviders.tsx");

    expect(provider).toContain('import { NajmAppProvider } from "najm-next/app/client"');
    expect(provider).toContain("<NajmAppProvider");
    expect(provider).not.toContain("query={true}");
    expect(provider).not.toContain("createNajmAppProvider");
    expect(provider).not.toContain("NajmNextAppProvider");
    expect(provider).not.toContain("bindNajmNextProvider");
    expect(provider).not.toContain("QueryClientProvider");
    expect(provider).not.toContain("createQueryClient");
    expect(provider).not.toContain("shouldRetry");
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
