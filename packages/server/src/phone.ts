import { z } from "zod";
import { normalizePhone } from "@kafil/contracts/phone";

/**
 * The backend's phone validation boundary for profile DTOs. Normalization is
 * the shared `normalizePhone` from `@kafil/contracts/phone`, so the web forms
 * and the API accept exactly the same numbers.
 */
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
