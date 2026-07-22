import { z } from "zod";

export function normalizePhone(value: string) {
  const compact = value.trim().replace(/[\s().-]+/g, "");
  const withCountryCode = compact.startsWith("0")
    ? `+212${compact.slice(1)}`
    : compact.startsWith("212")
      ? `+${compact}`
      : compact;

  return /^\+[1-9]\d{7,14}$/.test(withCountryCode)
    ? withCountryCode
    : null;
}

export const phoneDto = z.string().trim().transform((value, context) => {
  const normalized = normalizePhone(value);
  if (!normalized) {
    context.addIssue({
      code: "custom",
      message: "Enter a valid phone number with a country code",
    });
    return z.NEVER;
  }
  return normalized;
});
