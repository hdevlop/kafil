import { describe, expect, it } from "bun:test";

import {
  FamilyImageAccess,
  FAMILY_IMAGE_SERVE_PREFIX,
} from "../src/modules/families/familyImageController";
import { FamilyRepository } from "../src/modules/families/familyRepository";
import {
  SponsorImageAccess,
  SPONSOR_IMAGE_SERVE_PREFIX,
} from "../src/modules/sponsors/sponsorImageController";
import { SponsorRepository } from "../src/modules/sponsors/sponsorRepository";

const fileName = "00000000-0000-4000-8000-000000000099.webp";

describe("profile image ownership", () => {
  it("allows a family to read only its own photo", async () => {
    const access = new FamilyImageAccess({
      findByUserId: async (userId: string) => ({
        image:
          userId === "owner"
            ? `${FAMILY_IMAGE_SERVE_PREFIX}${fileName}`
            : `${FAMILY_IMAGE_SERVE_PREFIX}00000000-0000-4000-8000-000000000098.webp`,
      }),
    } as unknown as FamilyRepository);

    await expect(
      access.assertCanRead(fileName, { role: "family", userId: "owner" }),
    ).resolves.toBeUndefined();
    await expect(
      access.assertCanRead(fileName, { role: "family", userId: "other" }),
    ).rejects.toThrow("Family image access denied");
    await expect(
      access.assertCanRead(fileName, { role: "sponsor", userId: "sponsor" }),
    ).rejects.toThrow("Family image access denied");
  });

  it("allows a sponsor to read only its own photo", async () => {
    const access = new SponsorImageAccess({
      findByUserId: async (userId: string) => ({
        image:
          userId === "owner"
            ? `${SPONSOR_IMAGE_SERVE_PREFIX}${fileName}`
            : `${SPONSOR_IMAGE_SERVE_PREFIX}00000000-0000-4000-8000-000000000098.webp`,
      }),
    } as unknown as SponsorRepository);

    await expect(
      access.assertCanRead(fileName, { role: "sponsor", userId: "owner" }),
    ).resolves.toBeUndefined();
    await expect(
      access.assertCanRead(fileName, { role: "sponsor", userId: "other" }),
    ).rejects.toThrow("Sponsor image access denied");
    await expect(
      access.assertCanRead(fileName, { role: "family", userId: "family" }),
    ).rejects.toThrow("Sponsor image access denied");
  });

  it("allows operators and admins to manage profile photos", async () => {
    const families = new FamilyImageAccess({} as FamilyRepository);
    const sponsors = new SponsorImageAccess({} as SponsorRepository);
    for (const role of ["operator", "admin"]) {
      await expect(
        families.assertCanRead(fileName, { role, userId: role }),
      ).resolves.toBeUndefined();
      await expect(
        sponsors.assertCanRead(fileName, { role, userId: role }),
      ).resolves.toBeUndefined();
    }
  });
});
