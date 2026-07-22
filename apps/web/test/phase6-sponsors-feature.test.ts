import { describe, expect, test } from "bun:test";

import {
  createSponsorFormSchema,
  sponsorStatusFormSchema,
  toCreateSponsorInput,
  toUpdateSponsorInput,
  updateSponsorFormSchema,
} from "../src/features/Sponsors/config/sponsorSchemas";
import { sponsorKeys } from "../src/features/Sponsors/hooks/sponsorKeys";

describe("Phase 6C sponsor invitation form", () => {
  test("creates an operator-managed sponsor payload without a caller-supplied password", () => {
    const values = createSponsorFormSchema.parse({
      name: "  Amina Sponsor  ",
      email: "amina@example.com",
      phone: "+212600000000",
      cin: "ab123456",
      gender: "F",
      address: "Rabat",
      dateOfBirth: "1990-05-20",
      notes: " ",
    });

    const input = toCreateSponsorInput(values);

    expect(input).toEqual({
      name: "Amina Sponsor",
      email: "amina@example.com",
      phone: "+212600000000",
      cin: "AB123456",
      gender: "F",
      address: "Rabat",
      dateOfBirth: "1990-05-20",
      notes: null,
    });
    expect(input).not.toHaveProperty("password");
    expect(input).not.toHaveProperty("role");
    expect(input).not.toHaveProperty("status");
  });

  test("requires the sponsor identity profile for operator-created accounts", () => {
    expect(
      createSponsorFormSchema.safeParse({
        name: "A",
        email: "not-an-email",
        phone: "",
        cin: "short",
        gender: "unknown",
        address: "",
        dateOfBirth: "not-a-date",
      }).success,
    ).toBe(false);
  });
});

describe("Phase 6C sponsor update and lifecycle contracts", () => {
  test("updates only allowed account/profile fields and supports legacy backfill", () => {
    const values = updateSponsorFormSchema.parse({
      name: "Amina Sponsor",
      email: "amina@example.com",
      phone: "",
      cin: "ab123456",
      gender: "F",
      address: "Casablanca",
      dateOfBirth: "1990-05-20",
      notes: "  ",
    });

    const input = toUpdateSponsorInput(values);

    expect(input).toEqual({
      name: "Amina Sponsor",
      email: "amina@example.com",
      cin: "AB123456",
      gender: "F",
      address: "Casablanca",
      dateOfBirth: "1990-05-20",
      notes: null,
    });
    expect(input).not.toHaveProperty("password");
    expect(input).not.toHaveProperty("role");
    expect(input).not.toHaveProperty("status");
  });

  test("requires a reason for audited lifecycle commands", () => {
    expect(sponsorStatusFormSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(
      sponsorStatusFormSchema.safeParse({ reason: "Sponsor requested a pause" })
        .success,
    ).toBe(true);
  });

  test("keeps stable list and detail query keys", () => {
    expect(sponsorKeys.list({ limit: 25, offset: 50 })).toEqual([
      "sponsors",
      "list",
      { limit: 25, offset: 50 },
    ]);
    expect(sponsorKeys.detail("sponsor-1")).toEqual([
      "sponsors",
      "detail",
      "sponsor-1",
    ]);
  });
});
