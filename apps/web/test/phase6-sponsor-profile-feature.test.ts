import { describe, expect, test } from "bun:test";

import {
  createOwnSponsorProfileFormSchema,
  toCreateOwnSponsorProfileInput,
  toUpdateOwnSponsorProfileInput,
  updateOwnSponsorProfileFormSchema,
} from "../src/features/SponsorProfile/config/sponsorProfileSchemas";
import { sponsorProfileKeys } from "../src/features/SponsorProfile/hooks/sponsorProfileKeys";
import { isSponsorProfileMissing } from "../src/features/SponsorProfile/lib/isSponsorProfileMissing";
import { KafilApiError } from "../src/services/apiError";

describe("Phase 6F sponsor profile completion", () => {
  test("creates the self-service profile payload without account or lifecycle controls", () => {
    const values = createOwnSponsorProfileFormSchema.parse({
      phone: " +212600000000 ",
      cin: " ab123456 ",
      gender: "F",
      address: " Rabat ",
      dateOfBirth: "1990-05-20",
    });

    const input = toCreateOwnSponsorProfileInput(values);

    expect(input).toEqual({
      phone: "+212600000000",
      cin: "AB123456",
      gender: "F",
      address: "Rabat",
      dateOfBirth: "1990-05-20",
    });
    expect(input).not.toHaveProperty("name");
    expect(input).not.toHaveProperty("email");
    expect(input).not.toHaveProperty("role");
    expect(input).not.toHaveProperty("status");
    expect(input).not.toHaveProperty("notes");
  });

  test("requires every backend-required field when completing a new profile", () => {
    expect(
      createOwnSponsorProfileFormSchema.safeParse({
        phone: "",
        cin: "short",
        gender: "unknown",
        address: "",
        dateOfBirth: "not-a-date",
      }).success,
    ).toBe(false);
  });

  test("updates only non-empty allowed private fields", () => {
    const values = updateOwnSponsorProfileFormSchema.parse({
      phone: "",
      cin: " ab123456 ",
      gender: "M",
      address: " Casablanca ",
      dateOfBirth: "",
    });

    expect(toUpdateOwnSponsorProfileInput(values)).toEqual({
      cin: "AB123456",
      gender: "M",
      address: "Casablanca",
    });
  });

  test("uses a separate self-profile query and treats only a 404 as incomplete", () => {
    expect(sponsorProfileKeys.profile).toEqual([
      "sponsor-profile",
      "detail",
      "me",
    ]);
    expect(isSponsorProfileMissing(new KafilApiError("Missing", { status: 404 }))).toBe(true);
    expect(isSponsorProfileMissing(new KafilApiError("Forbidden", { status: 403 }))).toBe(false);
  });
});
