import {
  buildFormFill,
  type FormFillOverrides,
} from "@kafil/seed/fakers";
import type { z } from "zod";

const disabledValues = new Set(["0", "false", "off", "no"]);

export const isDevFormFillEnabled =
  process.env.NODE_ENV === "development" &&
  !disabledValues.has(
    String(process.env.NEXT_PUBLIC_FORM_FILL_ENABLED ?? "true").toLowerCase(),
  );

export function devFormTools<TSchema extends z.ZodType>(
  schema: TSchema,
  overrides: FormFillOverrides = {},
) {
  return {
    enabled: isDevFormFillEnabled,
    fill: () =>
      buildFormFill(schema, overrides) as Partial<z.infer<TSchema>>,
  };
}
