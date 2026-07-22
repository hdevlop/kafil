import { z } from "zod";

import type {
  CreateSupportAssignmentInput,
  UpdateSupportAssignmentNotesInput,
} from "../types";

export const createSupportAssignmentFormSchema = z.object({
  sponsorProfileId: z.uuid("Choose a sponsor"),
  familyProfileId: z.uuid("Choose a family"),
  notes: z.string().trim().max(2_000).optional(),
}).strict();

export const endSupportAssignmentFormSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export const updateSupportAssignmentNotesFormSchema = z.object({
  notes: z.string().trim().max(2_000).optional(),
});

export type CreateSupportAssignmentFormValues = z.infer<
  typeof createSupportAssignmentFormSchema
>;
export type EndSupportAssignmentFormValues = z.infer<
  typeof endSupportAssignmentFormSchema
>;
export type UpdateSupportAssignmentNotesFormValues = z.infer<
  typeof updateSupportAssignmentNotesFormSchema
>;

function nullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function toCreateSupportAssignmentInput(
  values: CreateSupportAssignmentFormValues,
): CreateSupportAssignmentInput {
  return {
    sponsorProfileId: values.sponsorProfileId,
    familyProfileId: values.familyProfileId,
    notes: nullable(values.notes),
  };
}

export function toUpdateSupportAssignmentNotesInput(
  id: string,
  values: UpdateSupportAssignmentNotesFormValues,
): UpdateSupportAssignmentNotesInput {
  return { id, notes: nullable(values.notes) };
}
