import { describe, expect, test } from "bun:test";
import { buildFormFill } from "@kafil/seed/fakers";

import {
  createChildFormSchema,
  updateChildFormSchema,
} from "../src/features/Children/config/childSchemas";
import { createFamilyFormSchema } from "../src/features/Families/config/familySchemas";
import {
  createSponsorFormSchema,
  updateSponsorFormSchema,
} from "../src/features/Sponsors/config/sponsorSchemas";
import {
  manualBudgetAdjustmentFormSchema,
  monthlyBudgetLimitFormSchema,
} from "../src/features/Budgets/config/budgetSchemas";
import {
  inventoryAdjustmentFormSchema,
  inventoryRestockFormSchema,
} from "../src/features/Inventory/config/inventorySchemas";
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

  test("generate valid operational form values", () => {
    const cases = [
      [monthlyBudgetLimitFormSchema, buildFormFill(monthlyBudgetLimitFormSchema)],
      [
        manualBudgetAdjustmentFormSchema,
        buildFormFill(manualBudgetAdjustmentFormSchema),
      ],
      [inventoryRestockFormSchema, buildFormFill(inventoryRestockFormSchema)],
      [
        inventoryAdjustmentFormSchema,
        buildFormFill(inventoryAdjustmentFormSchema),
      ],
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
