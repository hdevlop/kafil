import { createUserDto, updateUserDto } from "najm-auth";
import { z } from "zod";

import { positiveMinorAmountDto } from "../budgets/money";
import { FAMILY_IMAGE_SERVE_PREFIX } from "./familyImageController";
import { createInitialChildDto } from "../children/childDto";
import { phoneDto } from "../access/phone";

const familyIdentityFields = z.object({
  guardianCin: z.string().trim().min(8).max(20).toUpperCase(),
  guardianDateOfBirth: z.iso.date(),
  exactAddress: z.string().trim().min(5).max(1_000),
  phone: phoneDto,
});

const familyProfileFields = z.object({
  relationshipToChildren: z.string().trim().max(120).nullish(),
  notes: z.string().trim().max(2_000).nullish(),
});

const familyImage = z.union([
  z.url().max(2_000),
  z.string().startsWith(FAMILY_IMAGE_SERVE_PREFIX).max(2_000),
]);

export const createFamilyDto = createUserDto
  .omit({
    emailVerified: true,
    password: true,
    roleId: true,
    status: true,
  })
  .extend({
    id: z.string().uuid().optional(),
    userId: z.string().min(1).optional(),
    name: z.string().trim().min(2).max(200),
    image: familyImage.nullish(),
    fundingTargetMinor: positiveMinorAmountDto.optional(),
    initialChildren: z.array(createInitialChildDto).max(20).default([]),
    ...familyIdentityFields.shape,
    ...familyProfileFields.shape,
  });

export const updateFamilyDto = updateUserDto
  .omit({
    emailVerified: true,
    password: true,
    roleId: true,
    status: true,
  })
  .extend({
    image: familyImage.nullish(),
    ...familyIdentityFields.partial().shape,
    ...familyProfileFields.partial().shape,
    fundingTargetMinor: positiveMinorAmountDto.optional(),
  });
export const familyIdParams = z.object({
  id: z.string().uuid(),
});
export const familyListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const accountStatusDto = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type CreateFamilyDto = z.input<typeof createFamilyDto>;
export type UpdateFamilyDto = z.input<typeof updateFamilyDto>;
export type FamilyListQuery = z.input<typeof familyListQuery>;
export type AccountStatusDto = z.input<typeof accountStatusDto>;
