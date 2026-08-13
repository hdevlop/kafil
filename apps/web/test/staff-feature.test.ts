import { describe, expect, test } from "bun:test";

import { getDashboardNavigation } from "../src/shared/DashboardShell";

import {
  createStaffFormSchema,
  provisionStaffAccessSchema,
  staffStatusFormSchema,
  toCreateStaffInput,
  toUpdateStaffInput,
  updateStaffFormSchema,
} from "../src/features/Staff/config/staffSchemas";
import { staffKeys } from "../src/features/Staff/hooks/staffKeys";
import { matchesStaffFunction } from "../src/features/Staff/hooks/useStaffTableColumns";

describe("Staff admin-only navigation", () => {
  test("keeps the operator navigation free of the Staff management route", () => {
    const navigation = getDashboardNavigation("operator");

    expect(navigation.map((item) => item.id)).not.toContain("/staff");
  });

  test("exposes the Staff management route only to admins after Sponsors", () => {
    const navigation = getDashboardNavigation("admin");
    const staffItem = navigation.find((item) => item.id === "/staff");
    const staffIndex = navigation.findIndex(
      (item) => item.id === "/staff",
    );
    const sponsorsIndex = navigation.findIndex(
      (item) => item.id === "/sponsors",
    );

    expect(staffItem).toBeDefined();
    expect(staffIndex).toBe(sponsorsIndex + 1);
  });
});

describe("Staff form contracts", () => {
  test("rejects an Operator capability without its required profile fields", () => {
    expect(
      createStaffFormSchema.safeParse({
        address: "Rabat",
        affiliation: "internal",
        contactEmail: "operator@example.test",
        dateOfBirth: "1990-05-20",
        gender: "F",
        name: "Safe Operator",
        phone: "+212600000000",
        functions: ["operator"],
      }).success,
    ).toBe(false);
  });

  test("maps Operator and Delivery capabilities and provisions one operator login", () => {
    const values = createStaffFormSchema.parse({
        address: "Rabat",
        affiliation: "internal",
        cin: "AB123456",
        contactEmail: "operator@example.test",
        dateOfBirth: "1990-05-20",
        gender: "F",
        name: "Safe Operator",
        phone: "+212600000000",
        functions: ["operator", "delivery"],
      });

    expect(toCreateStaffInput(values)).toMatchObject({
      createOperatorAccess: true,
      createOperatorAccessEmail: "operator@example.test",
      functions: ["operator", "delivery"],
    });
  });

  test("refuses operator access for external staff records", () => {
    expect(
      createStaffFormSchema.safeParse({
        affiliation: "external",
        companyName: "DHL",
        contactEmail: "ops@dhl.test",
        name: "External Operator",
        phone: "+212600000000",
        functions: ["operator"],
      }).success,
    ).toBe(false);
  });

  test("accepts a complete delivery-only staff profile with no application access", () => {
    const values = createStaffFormSchema.parse({
      address: "Rabat",
      affiliation: "internal",
      cin: "AB123456",
      contactEmail: "delivery@example.test",
      dateOfBirth: "1990-05-20",
      gender: "F",
      name: "Delivery Driver",
      phone: "+212600000000",
      functions: ["delivery"],
    });

    const input = toCreateStaffInput(values);

    expect(input).toMatchObject({
      affiliation: "internal",
      companyName: null,
      cin: "AB123456",
      contactEmail: "delivery@example.test",
      createOperatorAccess: false,
      dateOfBirth: "1990-05-20",
      functions: ["delivery"],
      gender: "F",
      name: "Delivery Driver",
      phone: "+212600000000",
    });
  });

  test("preserves shared identity values for a Delivery-only profile", () => {
    const input = toUpdateStaffInput(
      updateStaffFormSchema.parse({
        address: "Hidden address",
        affiliation: "internal",
        cin: "AB123456",
        companyName: "",
        contactEmail: "dispatch@example.test",
        dateOfBirth: "1990-05-20",
        gender: "F",
        name: "Delivery Driver",
        phone: "+212600000000",
        functions: ["delivery"],
      }),
    );

    expect(input).toMatchObject({
      address: "Hidden address",
      affiliation: "internal",
      cin: "AB123456",
      companyName: null,
      dateOfBirth: "1990-05-20",
      functions: ["delivery"],
      gender: "F",
    });
  });
});

describe("Staff lifecycle and access provisioning contracts", () => {
  test("requires a meaningful reason for deactivate/reactivate", () => {
    expect(staffStatusFormSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(
      staffStatusFormSchema.safeParse({
        reason: "Operator left the programme",
      }).success,
    ).toBe(true);
  });

  test("requires a valid email to provision operator access for existing staff", () => {
    expect(provisionStaffAccessSchema.safeParse({ email: "" }).success).toBe(
      false,
    );
    expect(
      provisionStaffAccessSchema.safeParse({
        email: "operator@example.test",
      }).success,
    ).toBe(true);
  });
});

describe("Staff query keys", () => {
  test("matches a selected function against the staff function array", () => {
    expect(matchesStaffFunction(["operator"], "operator")).toBe(true);
    expect(matchesStaffFunction(["operator"], "delivery")).toBe(false);
    expect(matchesStaffFunction(["operator", "delivery"], "delivery")).toBe(
      true,
    );
  });

  test("encodes the filter set inside the list query key", () => {
    const key = staffKeys.list({
      affiliation: "external",
      functionKey: "delivery",
      hasAccess: false,
      limit: 25,
      offset: 0,
      search: "kafil",
      status: "active",
    });

    expect(key[0]).toBe("staff");
    expect(key[1]).toBe("list");
    expect(key[2]).toMatchObject({
      affiliation: "external",
      functionKey: "delivery",
      hasAccess: false,
      search: "kafil",
      status: "active",
    });
  });
});
