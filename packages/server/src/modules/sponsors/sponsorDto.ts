import {
  createUserDto,
  updateUserDto,
} from "najm-auth";
import { z } from "zod";
import { phoneDto } from "../access/phone";

const sponsorProfileDto = z.object({
  phone: phoneDto,
  cin: z.string().trim().min(8).max(20).toUpperCase(),
  gender: z.enum(["M", "F"]),
  address: z.string().trim().min(1).max(500),
  dateOfBirth: z.iso.date(),
  notes: z.string().trim().max(2_000).nullish(),
});

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
    ...sponsorProfileDto.partial().shape,
  });
export const createOwnSponsorProfileDto = sponsorProfileDto.omit({
  notes: true,
});
export const updateOwnSponsorProfileDto = createOwnSponsorProfileDto.partial();
export const sponsorIdParams = z.object({
  id: z.string().uuid(),
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
