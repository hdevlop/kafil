import { describe, expect, it } from "bun:test";

import {
  SponsorImageAccess,
  SPONSOR_IMAGE_SERVE_PREFIX,
} from "../src/modules/sponsors/sponsorImageController";
import { SponsorRepository } from "../src/modules/sponsors/sponsorRepository";

const fileName = "00000000-0000-4000-8000-000000000099.webp";

describe("profile image ownership", () => {
  it("allows a sponsor to read only its own photo", async () => {
    const access = new SponsorImageAccess(
      {
        findByUserId: async (userId: string) => ({
          image:
            userId === "owner"
              ? `${SPONSOR_IMAGE_SERVE_PREFIX}${fileName}`
              : `${SPONSOR_IMAGE_SERVE_PREFIX}00000000-0000-4000-8000-000000000098.webp`,
        }),
      } as unknown as SponsorRepository,
    );

    await expect(
      access.assertCanRead(fileName, { role: "sponsor", userId: "owner" }),
    ).resolves.toBeUndefined();
    await expect(
      access.assertCanRead(fileName, { role: "sponsor", userId: "other" }),
    ).rejects.toThrow("Sponsor image access denied");
    await expect(
      access.assertCanRead(fileName, { role: "family", userId: "assigned-family" }),
    ).rejects.toThrow("Sponsor image access denied");
    await expect(
      access.assertCanRead(fileName, { role: "family", userId: "other-family" }),
    ).rejects.toThrow("Sponsor image access denied");
  });

  it("allows operators and admins to manage profile photos", async () => {
    const sponsors = new SponsorImageAccess({} as SponsorRepository);
    for (const role of ["operator", "admin"]) {
      await expect(
        sponsors.assertCanRead(fileName, { role, userId: role }),
      ).resolves.toBeUndefined();
    }
  });
});
