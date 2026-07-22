import { z } from "zod";

import { positiveMinorAmountDto } from "../budgets/money";

const id = z.string().uuid();

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const contributionIdParams = z.object({ id });
export const contributionPlanIdParams = z.object({ id });

export const contributionListQuery = z.object({
  familyProfileId: id.optional(),
  status: z.enum(["pending", "validated", "rejected", "refunded"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const contributionPlanListQuery = z.object({
  status: z.enum(["active", "paused", "stopped", "completed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createContributionPlanDto = z
  .object({
    supportAssignmentId: id,
    kind: z.enum(["monthly", "one_time"]),
    amountMinor: positiveMinorAmountDto,
    startsAt: z.coerce.date().optional(),
    nextDueAt: z.coerce.date().optional(),
  })
  .superRefine((input, context) => {
    if (input.kind === "one_time" && input.nextDueAt) {
      context.addIssue({
        code: "custom",
        message: "One-time plans cannot have a next due date.",
        path: ["nextDueAt"],
      });
    }
  });

export const createContributionDto = z.object({
  supportAssignmentId: id,
  contributionPlanId: id.optional(),
  amountMinor: positiveMinorAmountDto,
  paymentMethod: z.string().trim().min(2).max(80),
  externalReference: z.string().trim().min(1).max(160).nullish(),
  paidAt: z.coerce.date().optional(),
});

export const recordContributionDto = createContributionDto
  .extend({
    paidAt: z.coerce.date(),
  })
  .superRefine((input, context) => {
    const paidDate = input.paidAt.toISOString().slice(0, 10);
    if (paidDate > localDateValue(new Date())) {
      context.addIssue({
        code: "custom",
        message: "Payment date cannot be in the future.",
        path: ["paidAt"],
      });
    }
  });

export const contributionReasonDto = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const bulkDeleteContributionsDto = z
  .object({
    ids: z.array(id).min(1).max(100),
  })
  .superRefine((input, context) => {
    if (new Set(input.ids).size !== input.ids.length) {
      context.addIssue({
        code: "custom",
        message: "Each contribution can only be selected once.",
        path: ["ids"],
      });
    }
  });

export type ContributionListQuery = z.input<typeof contributionListQuery>;
export type ContributionPlanListQuery = z.input<
  typeof contributionPlanListQuery
>;
export type CreateContributionPlanDto = z.input<
  typeof createContributionPlanDto
>;
export type CreateContributionDto = z.input<typeof createContributionDto>;
export type RecordContributionDto = z.input<typeof recordContributionDto>;
export type ContributionReasonDto = z.input<typeof contributionReasonDto>;
export type BulkDeleteContributionsDto = z.input<
  typeof bulkDeleteContributionsDto
>;
