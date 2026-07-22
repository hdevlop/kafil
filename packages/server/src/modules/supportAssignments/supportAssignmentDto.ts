import { z } from "zod";

export const supportAssignmentIdParams = z.object({
  id: z.string().uuid(),
});

export const createSupportAssignmentDto = z.object({
  sponsorProfileId: z.string().uuid(),
  familyProfileId: z.string().uuid(),
  childId: z.null().optional(),
  notes: z.string().trim().max(2_000).nullish(),
});

export const endSupportAssignmentDto = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const updateSupportAssignmentNotesDto = z.object({
  notes: z.string().trim().max(2_000).nullable(),
}).strict();

export const supportAssignmentListQuery = z.object({
  sponsorProfileId: z.string().uuid().optional(),
  familyProfileId: z.string().uuid().optional(),
  childId: z.string().uuid().optional(),
  status: z.enum(["active", "ended"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ownSupportAssignmentListQuery = z.object({
  status: z.enum(["active", "ended"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const sponsorFamilyCatalogQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const selectSponsorFamilyDto = z.object({
  familyProfileId: z.string().uuid(),
});

export type CreateSupportAssignmentDto = z.input<
  typeof createSupportAssignmentDto
>;
export type EndSupportAssignmentDto = z.input<typeof endSupportAssignmentDto>;
export type UpdateSupportAssignmentNotesDto = z.input<
  typeof updateSupportAssignmentNotesDto
>;
export type SupportAssignmentListQuery = z.input<
  typeof supportAssignmentListQuery
>;
export type OwnSupportAssignmentListQuery = z.input<
  typeof ownSupportAssignmentListQuery
>;
export type SponsorFamilyCatalogQuery = z.input<
  typeof sponsorFamilyCatalogQuery
>;
export type SelectSponsorFamilyDto = z.input<typeof selectSponsorFamilyDto>;
