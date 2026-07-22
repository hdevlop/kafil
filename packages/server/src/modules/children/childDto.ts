import { z } from "zod";

export const childFields = z.object({
  legalName: z.string().trim().min(2).max(200),
  dateOfBirth: z.iso.date(),
  gender: z.enum(["M", "F"]),
  schoolLevel: z.string().trim().max(120).nullish(),
  clothingSize: z.string().trim().max(40).nullish(),
  shoeSize: z.string().trim().max(40).nullish(),
  notes: z.string().trim().max(2_000).nullish(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const createChildDto = childFields.extend({
  familyProfileId: z.string().uuid(),
});
export const createInitialChildDto = childFields.omit({ status: true });
export const updateChildDto = childFields
  .omit({ status: true })
  .partial();
export const childIdParams = z.object({
  id: z.string().uuid(),
});
export const childListQuery = z.object({
  familyProfileId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const childStatusDto = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type CreateChildDto = z.input<typeof createChildDto>;
export type CreateInitialChildDto = z.input<typeof createInitialChildDto>;
export type UpdateChildDto = z.input<typeof updateChildDto>;
export type ChildListQuery = z.input<typeof childListQuery>;
export type ChildStatusDto = z.input<typeof childStatusDto>;
