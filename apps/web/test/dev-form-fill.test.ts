import { describe, expect, test } from "bun:test";
import { buildFormFill } from "najm-kit";

import {
  createChildFormSchema,
  updateChildFormSchema,
} from "../src/features/Children/config/childSchemas";
import { createFamilyFormSchema } from "../src/features/Families/config/familySchemas";
import {
  createSponsorFormSchema,
  updateSponsorFormSchema,
} from "../src/features/Sponsors/config/sponsorSchemas";
import { createCategoryFormSchema } from "../src/features/Categories/config/categorySchemas";
import { createProductFormSchema } from "../src/features/Products/config/productSchemas";

const householdId = "9cc2c93f-f545-4e07-9f77-f79f08a71dd5";
const categoryId = "7ca3da46-1849-45c2-8701-bbf18c67e8a9";

describe("F8 development form fills", () => {
  test("generate valid people and household form values", () => {
    const cases = [
      [
        createChildFormSchema,
        buildFormFill(createChildFormSchema, { familyProfileId: householdId }),
      ],
      [updateChildFormSchema, buildFormFill(updateChildFormSchema)],
      [createFamilyFormSchema, buildFormFill(createFamilyFormSchema)],
      [createSponsorFormSchema, buildFormFill(createSponsorFormSchema)],
      [updateSponsorFormSchema, buildFormFill(updateSponsorFormSchema)],
    ] as const;

    for (const [schema, values] of cases) {
      expect(schema.safeParse(values).success).toBe(true);
    }

    const familyValues = buildFormFill(createFamilyFormSchema);
    expect(["7000", "7500", "8000", "8500", "9000"]).toContain(
      String(familyValues.activationTargetMad),
    );
  });

  test("family policy and location F8 overrides stay schema-valid", () => {
    // Mirrors CreateFamilyDialog devTools overrides: najm-kit falls back to
    // `Test <field>` for these inputs, so the dialog supplies numeric strings.
    const values = buildFormFill(createFamilyFormSchema, {
      maxOrdersPerMonthInput: ["2", "4", "6"],
      monthlyBudgetMadInput: ["1500.00", "2000.00", "2500.00"],
      deliveryLocation: [
        { address: "12 Rue Example, Casablanca", latitude: 33.5731, longitude: -7.5898 },
      ],
    });

    expect(createFamilyFormSchema.safeParse(values).success).toBe(true);
    const count = Number(values.maxOrdersPerMonthInput);
    expect(Number.isInteger(count)).toBe(true);
    expect(count >= 1 && count <= 31).toBe(true);
    for (const field of ["monthlyBudgetMadInput"] as const) {
      expect(Number.isFinite(Number(values[field]))).toBe(true);
      expect(String(values[field])).not.toStartWith("Test ");
    }
    expect(String(values.maxOrdersPerMonthInput)).not.toStartWith("Test ");
    expect(values.deliveryLocation).toEqual({
      address: "12 Rue Example, Casablanca",
      latitude: 33.5731,
      longitude: -7.5898,
    });
  });

  test("generate valid operational form values", () => {
    const cases = [
      [createCategoryFormSchema, buildFormFill(createCategoryFormSchema)],
      [
        createProductFormSchema,
        buildFormFill(createProductFormSchema, { categoryId }),
      ],
    ] as const;

    for (const [schema, values] of cases) {
      expect(schema.safeParse(values).success).toBe(true);
    }
  });
});
