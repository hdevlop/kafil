import { describe, expect, test } from "bun:test";

import {
  childStatusFormSchema,
  createChildFormSchema,
  toCreateChildInput,
  toUpdateChildInput,
  updateChildFormSchema,
} from "../src/features/Children/config/childSchemas";
import { childKeys } from "../src/features/Children/hooks/childKeys";

describe("Phase 6C child form contracts", () => {
  test("creates a household-linked, status-safe child payload", () => {
    const values = createChildFormSchema.parse({
      familyProfileId: "9cc2c93f-f545-4e07-9f77-f79f08a71dd5",
      legalName: "  Sara Youssef  ",
      dateOfBirth: "2015-04-18",
      gender: "F",
      schoolLevel: "Primary",
      clothingSize: " ",
      shoeSize: "32",
      notes: " ",
    });

    const input = toCreateChildInput(values);

    expect(input).toEqual({
      familyProfileId: "9cc2c93f-f545-4e07-9f77-f79f08a71dd5",
      legalName: "Sara Youssef",
      dateOfBirth: "2015-04-18",
      gender: "F",
      schoolLevel: "Primary",
      clothingSize: null,
      shoeSize: "32",
      notes: null,
    });
    expect(input).not.toHaveProperty("status");
  });

  test("requires the owner household and valid child fields", () => {
    expect(
      createChildFormSchema.safeParse({
        familyProfileId: "",
        legalName: "S",
        dateOfBirth: "not-a-date",
        gender: "unknown",
      }).success,
    ).toBe(false);
  });

  test("updates profile fields without changing household ownership or status", () => {
    const values = updateChildFormSchema.parse({
      legalName: "Sara Youssef",
      dateOfBirth: "2015-04-18",
      gender: "F",
      schoolLevel: "  ",
      clothingSize: "8 years",
      shoeSize: "",
      notes: "School supplies needed",
    });

    const input = toUpdateChildInput(values);

    expect(input).toEqual({
      legalName: "Sara Youssef",
      dateOfBirth: "2015-04-18",
      gender: "F",
      schoolLevel: null,
      clothingSize: "8 years",
      shoeSize: null,
      notes: "School supplies needed",
    });
    expect(input).not.toHaveProperty("familyProfileId");
    expect(input).not.toHaveProperty("status");
  });
});

describe("Phase 6C child lifecycle contracts", () => {
  test("requires a reason for audited lifecycle commands", () => {
    expect(childStatusFormSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(
      childStatusFormSchema.safeParse({ reason: "Family requested a pause" })
        .success,
    ).toBe(true);
  });

  test("keeps stable list and detail query keys", () => {
    expect(childKeys.list({ limit: 25, offset: 50 })).toEqual([
      "children",
      "list",
      { limit: 25, offset: 50 },
    ]);
    expect(childKeys.detail("child-1")).toEqual([
      "children",
      "detail",
      "child-1",
    ]);
  });
});
