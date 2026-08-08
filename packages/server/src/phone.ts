import { z } from "zod";

/**
 * Phone validation for profile fields — applicants, families, sponsors, staff.
 *
 * Deliberately not `normalizeMoroccanPhone` from `najm-auth/identity/ma`. That
 * one resolves a *login identifier* and accepts Moroccan forms only; Najm
 * applies it automatically now that `ma` is the default preset. This one
 * validates a stored contact number, and a sponsor may live anywhere, so it
 * takes a Moroccan local number as a convenience and any other E.164 number as
 * given.
 */
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
