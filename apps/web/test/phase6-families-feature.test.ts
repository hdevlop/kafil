import { describe, expect, test } from "bun:test";

import {
  createFamilyFormSchema,
  familyStatusFormSchema,
  maskGuardianCin,
  toCreateFamilyInput,
  toUpdateFamilyInput,
  updateFamilyFormSchema,
} from "../src/features/Families/config/familySchemas";
import { familyKeys } from "../src/features/Families/hooks/familyKeys";

describe("Phase 6C family invitation form", () => {
  test("creates a family invitation with its own activation target", () => {
    const values = createFamilyFormSchema.parse({
      name: "Amina Guardian",
      email: "amina@example.com",
      guardianCin: "ab123456",
      guardianDateOfBirth: "1987-03-12",
      exactAddress: "12 Example Street, Casablanca",
      phone: "+212600000001",
      activationTargetMad: "7200",
      initialChildren: [],
      relationshipToChildren: "Mother",
      notes: "",
    });

    const input = toCreateFamilyInput(values);

    expect(input).toEqual({
      name: "Amina Guardian",
      email: "amina@example.com",
      guardianCin: "AB123456",
      guardianDateOfBirth: "1987-03-12",
      exactAddress: "12 Example Street, Casablanca",
      phone: "+212600000001",
      fundingTargetMinor: 720000,
      initialChildren: [],
      relationshipToChildren: "Mother",
      notes: null,
    });
    expect(input).not.toHaveProperty("password");
    expect(input).not.toHaveProperty("role");
    expect(input).not.toHaveProperty("status");
  });

  test("creates a family with normalized initial children", () => {
    const values = createFamilyFormSchema.parse({
      name: "Youssef Guardian",
      email: "youssef@example.com",
      guardianCin: "cd987654",
      guardianDateOfBirth: "1982-09-21",
      exactAddress: "12 Example Street, Casablanca",
      phone: "+212600000002",
      activationTargetMad: "8500.50",
      initialChildren: [
        {
          legalName: "Sara Youssef",
          dateOfBirth: "2015-04-18",
          gender: "F",
          schoolLevel: "Primary",
          clothingSize: "",
          shoeSize: "",
          notes: "",
        },
      ],
      relationshipToChildren: "Father",
      notes: "Intake completed",
    });

    expect(toCreateFamilyInput(values)).toEqual({
      name: "Youssef Guardian",
      email: "youssef@example.com",
      guardianCin: "CD987654",
      guardianDateOfBirth: "1982-09-21",
      exactAddress: "12 Example Street, Casablanca",
      phone: "+212600000002",
      fundingTargetMinor: 850050,
      initialChildren: [
        {
          legalName: "Sara Youssef",
          dateOfBirth: "2015-04-18",
          gender: "F",
          schoolLevel: "Primary",
          clothingSize: null,
          shoeSize: null,
          notes: null,
        },
      ],
      relationshipToChildren: "Father",
      notes: "Intake completed",
    });
  });

  test("requires guardian CIN, a family address, and an activation target", () => {
    const common = {
      name: "Family Guardian",
      email: "family@example.com",
      guardianDateOfBirth: "1985-01-01",
      initialChildren: [],
      relationshipToChildren: "Guardian",
      notes: "",
    };

    expect(
      createFamilyFormSchema.safeParse({
        ...common,
        guardianCin: "AB123456",
        exactAddress: "",
        phone: "",
        activationTargetMad: "7200",
      }).success,
    ).toBe(false);

    expect(
      createFamilyFormSchema.safeParse({
        ...common,
        guardianCin: "AB123456",
        exactAddress: "Another exact address",
        phone: "",
        activationTargetMad: "",
      }).success,
    ).toBe(false);

    expect(
      createFamilyFormSchema.safeParse({
        ...common,
        guardianCin: "",
        exactAddress: "Another exact address",
        phone: "",
        activationTargetMad: "7200",
      }).success,
    ).toBe(false);
  });

  test("masks guardian CIN in operator displays", () => {
    expect(maskGuardianCin("AB123456")).toBe("AB****56");
    expect(maskGuardianCin(null)).toBe("Not provided");
  });
});

describe("Phase 6C family lifecycle contracts", () => {
  test("uses the complete profile form without create-only child rows when updating a family", () => {
    const values = updateFamilyFormSchema.parse({
      name: "Amina Guardian",
      email: "amina@example.com",
      guardianCin: "ab123456",
      guardianDateOfBirth: "1987-03-12",
      exactAddress: "12 Example Street, Casablanca",
      phone: "+212600000001",
      relationshipToChildren: "Legal guardian",
      notes: "  ",
      activationTargetMad: "6400",
    });

    expect(toUpdateFamilyInput(values)).toEqual({
      name: "Amina Guardian",
      email: "amina@example.com",
      guardianCin: "AB123456",
      guardianDateOfBirth: "1987-03-12",
      exactAddress: "12 Example Street, Casablanca",
      phone: "+212600000001",
      relationshipToChildren: "Legal guardian",
      notes: null,
      fundingTargetMinor: 640000,
    });
    expect(updateFamilyFormSchema.safeParse({ ...values, initialChildren: [] }).data)
      .not.toHaveProperty("initialChildren");
  });

  test("requires a reason for lifecycle commands", () => {
    expect(familyStatusFormSchema.safeParse({ reason: "" }).success).toBe(
      false,
    );
    expect(
      familyStatusFormSchema.safeParse({ reason: "Account requested pause" })
        .success,
    ).toBe(true);
  });

  test("keeps stable list and detail query keys", () => {
    expect(familyKeys.list({ limit: 25, offset: 50 })).toEqual([
      "families",
      "list",
      { limit: 25, offset: 50 },
    ]);
    expect(familyKeys.detail("family-1")).toEqual([
      "families",
      "detail",
      "family-1",
    ]);
  });
});
