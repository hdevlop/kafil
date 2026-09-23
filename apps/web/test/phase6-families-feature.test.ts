import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  createFamilyFormSchema,
  createFamilyGuardianStepSchema,
  familyStatusFormSchema,
  maskGuardianCin,
  toCreateFamilyInput,
  toUpdateFamilyInput,
  updateFamilyFormSchema,
  updateFamilyHouseholdStepSchema,
} from "../src/features/Families/config/familySchemas";
import { familyHousingItems } from "../src/features/Families/config/housingOptions";
import {
  familyRelationshipItems,
  familyRelationshipLabel,
} from "../src/features/Families/config/relationshipOptions";
import { createFamilyDefaultValues } from "../src/features/Families/components/FamilyForms";
import { normalizePhone } from "@kafil/contracts/phone";
import { localDateInput } from "najm-kit/format";
import { familyKeys } from "../src/features/Families/hooks/familyKeys";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("Phase 6C family invitation form", () => {
  test("creates a family invitation with its own activation target", () => {
    const values = createFamilyFormSchema.parse({
      name: "Amina Guardian",
      email: "amina@example.com",
      guardianCin: "ab123456",
       guardianDateOfBirth: "1987-03-12",
      deliveryLocation: { address: "12 Example Street, Casablanca", latitude: null, longitude: null },
       housingSituation: "rented",
       registrationDate: "2026-01-15",
       supportPriority: "normal",
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
      deliveryLatitude: null,
      deliveryLongitude: null,
       housingSituation: "rented",
       registrationDate: "2026-01-15",
       supportPriority: "normal",
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
      deliveryLocation: { address: "12 Example Street, Casablanca", latitude: null, longitude: null },
       housingSituation: "hosted",
       registrationDate: "2026-02-10",
       supportPriority: "high",
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
       deliveryLatitude: null,
       deliveryLongitude: null,
       housingSituation: "hosted",
       registrationDate: "2026-02-10",
       supportPriority: "high",
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
        deliveryLocation: { address: "", latitude: null, longitude: null },
        phone: "",
        activationTargetMad: "7200",
      }).success,
    ).toBe(false);

    expect(
      createFamilyFormSchema.safeParse({
        ...common,
        guardianCin: "AB123456",
        deliveryLocation: { address: "Another exact address", latitude: null, longitude: null },
        phone: "",
        activationTargetMad: "",
      }).success,
    ).toBe(false);

    expect(
      createFamilyFormSchema.safeParse({
        ...common,
        guardianCin: "",
        deliveryLocation: { address: "Another exact address", latitude: null, longitude: null },
        phone: "",
        activationTargetMad: "7200",
      }).success,
    ).toBe(false);
  });

  test("defaults the household step to a local registration date and explicit priority", () => {
    const defaults = createFamilyDefaultValues();

    expect(String(defaults.housingSituation)).toBe("");
    expect(defaults.registrationDate).toBe(localDateInput());
    expect(defaults.supportPriority).toBe("normal");
  });

  test("masks guardian CIN in operator displays", () => {
    expect(maskGuardianCin("AB123456")).toBe("AB****56");
    expect(maskGuardianCin(null)).toBe("Not provided");
  });
});

describe("family housing select options", () => {
  const labels = {
    hosted: "Hosted",
    owned: "Owned",
    rented: "Rented",
    temporary: "Temporary",
    unknown: "Not recorded",
  };

  test("offers create-valid housing values when no historical unknown is selected", () => {
    const items = familyHousingItems("rented", labels, "Not recorded");

    expect(items.map((item) => item.value)).toEqual([
      "owned",
      "rented",
      "hosted",
      "temporary",
    ]);
    expect(items.map((item) => item.label)).toEqual([
      "Owned",
      "Rented",
      "Hosted",
      "Temporary",
    ]);
  });

  test("keeps the unknown option visible while editing a historical unknown family", () => {
    const items = familyHousingItems("unknown", labels, "Not recorded");

    expect(items.map((item) => item.value)).toEqual([
      "owned",
      "rented",
      "hosted",
      "temporary",
      "unknown",
    ]);
    expect(items.at(-1)?.label).toBe("Not recorded");
  });

  test("removes the unknown option once a recorded value is chosen", () => {
    const opening = familyHousingItems("unknown", labels, "Not recorded");
    expect(opening.some((item) => item.value === "unknown")).toBe(true);

    const afterCorrection = familyHousingItems(
      "rented",
      labels,
      "Not recorded",
    );
    expect(afterCorrection.some((item) => item.value === "unknown")).toBe(
      false,
    );
  });
});

describe("Phase 6C family lifecycle contracts", () => {
  test("waits for a hydrated user and access token before protected family lists", () => {
    const hooks = readSource("../src/features/Families/hooks/useFamilies.ts");

    expect(hooks).toContain('import { useAuth } from "najm-auth/client/react";');
    expect(hooks.match(/const \{ accessToken, user \} = useAuth\(\);/g)).toHaveLength(5);
    expect(hooks.match(/enabled: Boolean\(user && accessToken\) && enabled,/g)).toHaveLength(5);
    expect(hooks.match(/user\?\.role/g)).toHaveLength(5);
    expect(hooks.match(/user\?\.id/g)).toHaveLength(5);
  });

  test("uses the complete profile form without create-only child rows when updating a family", () => {
    const values = updateFamilyFormSchema.parse({
      name: "Amina Guardian",
      email: "amina@example.com",
      guardianCin: "ab123456",
       guardianDateOfBirth: "1987-03-12",
       deliveryLocation: { address: "12 Example Street, Casablanca", latitude: null, longitude: null },
       housingSituation: "rented",
       registrationDate: "2026-01-15",
       supportPriority: "normal",
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
       deliveryLatitude: null,
       deliveryLongitude: null,
       housingSituation: "rented",
       registrationDate: "2026-01-15",
       supportPriority: "normal",
       phone: "+212600000001",
      relationshipToChildren: "Legal guardian",
      notes: null,
      fundingTargetMinor: 640000,
      maxOrdersPerMonth: null,
      monthlyBudgetMinor: null,
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

  test("refreshes family and budget data after a profile update", () => {
    const hooks = readSource("../src/features/Families/hooks/useFamilies.ts");
    const updateStart = hooks.indexOf("const update = useEntityCommand");
    const removeStart = hooks.indexOf("const remove = useEntityCommand");
    const updateBlock = hooks.slice(updateStart, removeStart);

    expect(updateBlock).toContain("familyKeys.all");
    expect(updateBlock).toContain("budgetKeys.all");
  });
});

describe("family edit wizard parity", () => {
  const guardianBase = {
    name: "Karima Iraqi",
    email: "karima@example.test",
    guardianCin: "AB123456",
    guardianDateOfBirth: "1987-03-12",
    relationshipToChildren: "Mother",
    phone: "+212600000001",
  };

  const householdBase = {
    housingSituation: "rented",
    registrationDate: "2026-01-15",
    supportPriority: "normal",
    activationTargetMad: "6400",
    notes: "Operator notes",
    deliveryLocation: { address: "12 Example Street, Casablanca", latitude: null, longitude: null },
  } as const;

  test("update household step accepts stored unknown housing", () => {
    const parsed = updateFamilyHouseholdStepSchema.parse({
      ...householdBase,
      housingSituation: "unknown",
    });

    expect(parsed.housingSituation).toBe("unknown");
  });

  test("update household step requires coordinates as a pair", () => {
    expect(
      updateFamilyHouseholdStepSchema.safeParse({
        ...householdBase,
        deliveryLocation: { address: "12 Example Street, Casablanca", latitude: 33.5731, longitude: null },
      }).success,
    ).toBe(false);

    expect(
      updateFamilyHouseholdStepSchema.safeParse({
        ...householdBase,
        deliveryLocation: { address: "12 Example Street, Casablanca", latitude: null, longitude: -7.5898 },
      }).success,
    ).toBe(false);

    expect(
      updateFamilyHouseholdStepSchema.safeParse({
        ...householdBase,
        deliveryLocation: { address: "12 Example Street, Casablanca", latitude: 33.5731, longitude: -7.5898 },
      }).success,
    ).toBe(true);
  });

  test("update schemas retain editable order and monthly policy keys", () => {
    const withPolicy = {
      ...guardianBase,
      ...householdBase,
      maxOrdersPerMonthInput: "5",
      maxBudgetPerOrderMadInput: "1000",
      monthlyBudgetMadInput: "2000",
    };

    const stepParsed = updateFamilyHouseholdStepSchema.parse({
      ...householdBase,
      maxOrdersPerMonthInput: "5",
      maxBudgetPerOrderMadInput: "1000",
      monthlyBudgetMadInput: "2000",
    });
    expect(stepParsed.maxOrdersPerMonthInput).toBe("5");
    expect(stepParsed).not.toHaveProperty("maxBudgetPerOrderMadInput");
    expect(stepParsed.monthlyBudgetMadInput).toBe("2000");

    const formParsed = updateFamilyFormSchema.parse(withPolicy);
    expect(formParsed.maxOrdersPerMonthInput).toBe("5");
    expect(formParsed).not.toHaveProperty("maxBudgetPerOrderMadInput");
    expect(formParsed.monthlyBudgetMadInput).toBe("2000");
    expect(updateFamilyFormSchema.safeParse({ ...formParsed, initialChildren: [] }).data)
      .not.toHaveProperty("initialChildren");
  });

  test("update household step exposes the editable policy fields", () => {
    expect(Object.keys(updateFamilyHouseholdStepSchema.shape).sort()).toEqual(
      [
        "activationTargetMad",
        "deliveryLocation",
        "housingSituation",
        "maxOrdersPerMonthInput",
        "monthlyBudgetMadInput",
        "notes",
        "registrationDate",
        "supportPriority",
      ].sort(),
    );
  });

  test("toUpdateFamilyInput keeps profile fields, coordinates, and editable policy", () => {
    const values = updateFamilyFormSchema.parse({
      ...guardianBase,
      ...householdBase,
      deliveryLocation: { address: "12 Example Street, Casablanca", latitude: 33.5731, longitude: -7.5898 },
    });

    const input = toUpdateFamilyInput(values);

    expect(input).toEqual({
      name: "Karima Iraqi",
      email: "karima@example.test",
      guardianCin: "AB123456",
      guardianDateOfBirth: "1987-03-12",
      exactAddress: "12 Example Street, Casablanca",
      deliveryLatitude: 33.5731,
      deliveryLongitude: -7.5898,
      housingSituation: "rented",
      registrationDate: "2026-01-15",
      supportPriority: "normal",
      phone: "+212600000001",
      relationshipToChildren: "Mother",
      notes: "Operator notes",
      fundingTargetMinor: 640000,
      maxOrdersPerMonth: null,
      monthlyBudgetMinor: null,
    });
    expect(input).not.toHaveProperty("maxBudgetPerOrderMinor");
    expect(input).not.toHaveProperty("initialChildren");
  });

  test("edit wizard registers guardian and household policy fields", () => {
    const dialog = readSource(
      "../src/features/Families/components/FamilyForms/UpdateFamilyDialog.tsx",
    );

    expect(dialog).toContain("WizardForm");
    expect(dialog).toContain('id: "guardian"');
    expect(dialog).toContain('id: "household"');
    expect(dialog).toContain("createFamilyGuardianStepSchema");
    expect(dialog).toContain("updateFamilyHouseholdStepSchema");
    expect(dialog).toContain("showSectionHeader={false}");

    for (const field of [
      '"name"',
      '"guardianCin"',
      '"email"',
      '"guardianDateOfBirth"',
      '"relationshipToChildren"',
      '"phone"',
    ]) {
      expect(dialog).toContain(field);
    }
    for (const field of [
      '"housingSituation"',
      '"registrationDate"',
      '"supportPriority"',
      '"activationTargetMad"',
      '"maxOrdersPerMonthInput"',
      '"monthlyBudgetMadInput"',
      '"notes"',
      '"deliveryLocation"',
    ]) {
      expect(dialog).toContain(field);
    }
    expect(dialog).not.toContain('"maxBudgetPerOrderMadInput"');
    expect(dialog).not.toContain('"initialChildren"');
  });

  test("edit dialog uses a bounded wizard with a guarded submit path", () => {
    const dialogs = readSource("../src/features/Families/hooks/useFamiliesPageDialogs.tsx");
    const editStart = dialogs.indexOf("function openEdit");
    const statusStart = dialogs.indexOf("function openStatus");
    expect(editStart).toBeGreaterThanOrEqual(0);
    expect(statusStart).toBeGreaterThan(editStart);
    const editBlock = dialogs.slice(editStart, statusStart);

    expect(editBlock).toContain('width: "xxl"');
    expect(editBlock).toContain('height: "xl"');
    expect(editBlock).not.toContain('size: "xxl"');
    expect(editBlock).not.toContain('height: "auto"');

    const dialog = readSource(
      "../src/features/Families/components/FamilyForms/UpdateFamilyDialog.tsx",
    );
    expect(dialog).toContain("submittingRef");
    expect(dialog).toContain("aria-busy={isSubmitting}");
    expect(dialog).toContain("pointer-events-none select-none");
    expect(dialog).toContain('step: "min-h-0 flex-1 pb-4"');
    expect(dialog).not.toContain("overflow-y-hidden");
  });
});

describe("family guardian CIN boundary (7..20 ma-cin)", () => {
  const guardian = {
    name: "Amina Guardian",
    email: "amina@example.com",
    guardianCin: "AB123456",
    guardianDateOfBirth: "1987-03-12",
    phone: "+212600000001",
  };

  const parseCin = (guardianCin: string) =>
    createFamilyGuardianStepSchema.safeParse({ ...guardian, guardianCin });

  const validFamilyForm = {
    ...guardian,
    deliveryLocation: {
      address: "12 Example Street, Casablanca",
      latitude: null,
      longitude: null,
    },
    housingSituation: "rented",
    registrationDate: "2026-01-15",
    supportPriority: "normal",
    activationTargetMad: "7200",
    initialChildren: [],
    relationshipToChildren: "Mother",
    notes: "",
  };

  test("accepts the 7-character lower boundary", () => {
    // Real cards are one or two letters plus five or six digits. "BC10110" also
    // passes createSponsorFormSchema and createStaffFormSchema; since najm-auth
    // 4.0.6 the family form no longer has to be stricter than they are.
    expect(parseCin("BC10110").success).toBe(true);
    expect(parseCin("bb46123").success).toBe(true);
    expect(parseCin("A123456").success).toBe(true);
    expect(parseCin("AB123456").success).toBe(true);
  });

  test("accepts the 20-character upper boundary", () => {
    expect(parseCin(`ABC${"1".repeat(17)}`).success).toBe(true);
  });

  test("rejects a 6-character CIN", () => {
    // The guardian CIN is the family's first-login credential and familyService
    // provisions it through najm-auth's moroccanCinTemporaryCredential, whose
    // isMoroccanCin guard throws below 7.
    expect(parseCin("A12345").success).toBe(false);
  });

  test("rejects a 21-character CIN", () => {
    expect(parseCin(`ABC${"1".repeat(18)}`).success).toBe(false);
  });

  test("rejects a value that is not ma-cin shaped", () => {
    expect(parseCin("12345678").success).toBe(false);
    expect(parseCin("ABCD1234").success).toBe(false);
    expect(parseCin("AB12345X").success).toBe(false);
  });

  test("applies the rule to both the create and update family forms", () => {
    expect(createFamilyFormSchema.safeParse(validFamilyForm).success).toBe(true);
    expect(updateFamilyFormSchema.safeParse(validFamilyForm).success).toBe(true);

    const sixCharacter = { ...validFamilyForm, guardianCin: "A12345" };
    expect(createFamilyFormSchema.safeParse(sixCharacter).success).toBe(false);
    expect(updateFamilyFormSchema.safeParse(sixCharacter).success).toBe(false);
  });
});

describe("family guardian relationship and phone inputs", () => {
  const guardian = {
    name: "Amina Guardian",
    email: "amina@example.com",
    guardianCin: "AB123456",
    guardianDateOfBirth: "1987-03-12",
    relationshipToChildren: "mother",
    phone: "+212600000001",
  };

  const parsePhone = (phone: string) =>
    createFamilyGuardianStepSchema.safeParse({ ...guardian, phone });

  const translate = (key: string) => key;

  test("rejects the dial-code prefill and accepts every form the backend takes", () => {
    expect(parsePhone("+212").success).toBe(false);
    expect(parsePhone("").success).toBe(false);
    expect(parsePhone("+212600000001").success).toBe(true);
    expect(parsePhone("+212 600 000 001").success).toBe(true);
  });

  // The form rule delegates to the backend `normalizePhone`, so a stored
  // Moroccan local number stays editable instead of failing a stricter
  // frontend-only rule the server would never have applied.
  test("accepts exactly what the backend normalizer accepts", () => {
    for (const value of ["0600000001", "212600000001", "+212600000001", "+33612345678"]) {
      expect(parsePhone(value).success).toBe(normalizePhone(value) !== null);
      expect(parsePhone(value).success).toBe(true);
    }
    for (const value of ["+212", "", "0600", "not-a-phone"]) {
      expect(parsePhone(value).success).toBe(normalizePhone(value) !== null);
      expect(parsePhone(value).success).toBe(false);
    }
  });

  test("offers the canonical relationships and keeps a legacy stored value", () => {
    const items = familyRelationshipItems(undefined, translate);
    expect(items.map((item) => item.value)).toEqual([
      "",
      "mother",
      "father",
      "grandmother",
      "grandfather",
      "aunt",
      "uncle",
      "sibling",
      "legalGuardian",
      "other",
    ]);

    const legacy = familyRelationshipItems("Step-mother", translate);
    expect(legacy.at(-1)).toEqual({
      value: "Step-mother",
      label: "Step-mother",
    });
    expect(familyRelationshipItems("mother", translate)).toHaveLength(
      items.length,
    );
  });

  test("leads with a localized empty choice that is not `other`", () => {
    const [first] = familyRelationshipItems(undefined, translate);
    expect(first.value).toBe("");
    expect(first.label).toBe(
      "operator.families.relationshipOptions.notProvided",
    );

    const other = familyRelationshipItems(undefined, translate).find(
      (item) => item.value === "other",
    );
    expect(other?.label).toBe("operator.families.relationshipOptions.other");
    expect(other?.label).not.toBe(first.label);
  });

  test("translates a canonical relationship and passes free text through", () => {
    expect(familyRelationshipLabel("legalGuardian", translate)).toBe(
      "operator.families.relationshipOptions.legalGuardian",
    );
    expect(familyRelationshipLabel("Step-mother", translate)).toBe(
      "Step-mother",
    );
    expect(familyRelationshipLabel("", translate)).toBeNull();
    expect(familyRelationshipLabel(null, translate)).toBeNull();
  });

  test("renders relationship as a select and phone as the phone input", () => {
    const fields = readSource(
      "../src/features/Families/components/FamilyForms/GuardianFields.tsx",
    );

    expect(fields).toContain('name="relationshipToChildren"');
    expect(fields).toContain('type="select"');
    expect(fields).toContain("items={relationshipItems}");
    expect(fields).toContain('name="phone"');
    expect(fields).toContain('type="phone"');
    expect(fields).toContain('defaultCountry="ma"');
  });
});
