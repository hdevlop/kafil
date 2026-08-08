import { createUserDto, updateUserDto } from "najm-auth";
import { z } from "zod";

import { positiveMinorAmountDto } from "../budgets/money";
import { FAMILY_IMAGE_SERVE_PREFIX } from "./familyImageController";
import { createInitialChildDto } from "../children/childDto";
import { phoneDto } from "../../phone";

export const FAMILY_HOUSING_SITUATIONS = [
  "owned",
  "rented",
  "hosted",
  "temporary",
] as const;
export const FAMILY_STORED_HOUSING_SITUATIONS = [
  ...FAMILY_HOUSING_SITUATIONS,
  "unknown",
] as const;
export const FAMILY_SUPPORT_PRIORITIES = ["normal", "high", "urgent"] as const;

export type FamilyHousingSituation =
  (typeof FAMILY_STORED_HOUSING_SITUATIONS)[number];
export type FamilySupportPriority = (typeof FAMILY_SUPPORT_PRIORITIES)[number];

function casablancaDateValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Africa/Casablanca",
    year: "numeric",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  return `${year}-${month}-${day}`;
}

export const familyHousingSituationDto = z.enum(
  FAMILY_STORED_HOUSING_SITUATIONS,
);
export const createFamilyHousingSituationDto = z.enum(
  FAMILY_HOUSING_SITUATIONS,
);
export const familySupportPriorityDto = z.enum(FAMILY_SUPPORT_PRIORITIES);
export const familyRegistrationDateDto = z.iso
  .date()
  .refine((value) => value <= casablancaDateValue(new Date()), {
    message: "Registration date cannot be in the future.",
  });

const updateFamilyHousingSituationDto = familyHousingSituationDto
  .optional()
  .refine((value) => value !== "unknown", {
    message: "Choose a recorded housing situation.",
  });

const familyIdentityFields = z.object({
  // The CIN is the family's first-login credential, so it must satisfy Najm's
  // `ma-cin` shape here rather than failing inside provisioning.
  guardianCin: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^[a-z]{1,3}\d{5,17}$/i, "Enter a valid CIN, such as AB123456.")
    .toUpperCase(),
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
    housingSituation: createFamilyHousingSituationDto,
    registrationDate: familyRegistrationDateDto,
    supportPriority: familySupportPriorityDto,
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
    housingSituation: updateFamilyHousingSituationDto,
    registrationDate: familyRegistrationDateDto.optional(),
    supportPriority: familySupportPriorityDto.optional(),
    ...familyIdentityFields.partial().shape,
    ...familyProfileFields.partial().shape,
    fundingTargetMinor: positiveMinorAmountDto.optional(),
  });
export const familyIdParams = z.object({
  id: z.string().uuid(),
});
export const bulkDeleteFamiliesDto = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(100),
  })
  .superRefine((input, context) => {
    if (new Set(input.ids).size !== input.ids.length) {
      context.addIssue({
        code: "custom",
        message: "Each family can only be selected once.",
        path: ["ids"],
      });
    }
  });
export const familyListQuery = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
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
export type BulkDeleteFamiliesDto = z.input<typeof bulkDeleteFamiliesDto>;
