import {
  createUserDto,
  updateUserDto,
} from "najm-auth";
import { z } from "zod";
import { phoneDto } from "../access/phone";
import { SPONSOR_IMAGE_SERVE_PREFIX } from "./sponsorImageController";

const sponsorProfileDto = z.object({
  phone: phoneDto,
  cin: z.string().trim().min(8).max(20).toUpperCase(),
  gender: z.enum(["M", "F"]),
  address: z.string().trim().min(1).max(500),
  dateOfBirth: z.iso.date(),
  notes: z.string().trim().max(2_000).nullish(),
});

const sponsorImage = z.union([
  z.url().max(2_000),
  z.string().startsWith(SPONSOR_IMAGE_SERVE_PREFIX).max(2_000),
]);

export const createSponsorDto = createUserDto
  .omit({
    emailVerified: true,
    password: true,
    roleId: true,
    status: true,
  })
  .extend({
    id: z.string().uuid().optional(),
    userId: z.string().min(1).optional(),
    image: sponsorImage.nullish(),
    ...sponsorProfileDto.shape,
  });
export const updateSponsorDto = updateUserDto
  .omit({
    emailVerified: true,
    password: true,
    roleId: true,
    status: true,
  })
  .extend({
    image: sponsorImage.nullish(),
    ...sponsorProfileDto.partial().shape,
  });
export const createOwnSponsorProfileDto = sponsorProfileDto.omit({
  notes: true,
}).extend({
  image: sponsorImage.nullish(),
});
export const updateOwnSponsorProfileDto = createOwnSponsorProfileDto.partial();
export const sponsorIdParams = z.object({
  id: z.string().uuid(),
});
export const bulkDeleteSponsorsDto = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(100),
  })
  .superRefine((input, context) => {
    if (new Set(input.ids).size !== input.ids.length) {
      context.addIssue({
        code: "custom",
        message: "Each sponsor can only be selected once.",
        path: ["ids"],
      });
    }
  });
export const sponsorListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const sponsorStatusDto = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type CreateSponsorDto = z.input<typeof createSponsorDto>;
export type UpdateSponsorDto = z.input<typeof updateSponsorDto>;
export type SponsorListQuery = z.input<typeof sponsorListQuery>;
export type CreateOwnSponsorProfileDto = z.input<
  typeof createOwnSponsorProfileDto
>;
export type UpdateOwnSponsorProfileDto = z.input<
  typeof updateOwnSponsorProfileDto
>;
export type SponsorStatusDto = z.input<typeof sponsorStatusDto>;
export type BulkDeleteSponsorsDto = z.input<typeof bulkDeleteSponsorsDto>;
