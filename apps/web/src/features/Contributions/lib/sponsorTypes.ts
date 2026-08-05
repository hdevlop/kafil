import type { OffsetPagination } from "@/lib/pagination";
import type { FamilyFundingProgress } from "@/types/funding";

export interface SponsorSupportAssignment {
  id: string;
  familyProfileId: string;
  childId: string | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
}

export interface SponsorSupportSummary {
  assignment: SponsorSupportAssignment;
  target: { label: string; detail: string; reference: string };
}

export interface SponsorFamilyCatalogEntry {
  id: string;
  assignmentId: string | null;
  name: string;
  image: string | null;
  supportPriority: "normal" | "high" | "urgent";
  reference: string;
  activeChildCount: number;
  activeSponsorCount: number;
  funding: FamilyFundingProgress | null;
}

export interface SponsorContributionPlan {
  id: string;
  supportAssignmentId: string;
  kind: "monthly" | "one_time" | string;
  amountMinor: number;
  currency: string;
  status: "active" | "paused" | "stopped" | string;
  startsAt: string;
  nextDueAt: string | null;
}

export interface SponsorContribution {
  id: string;
  supportAssignmentId: string;
  amountMinor: number;
  currency: string;
  paymentMethod: string;
  externalReference: string | null;
  status: string;
  submittedAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  expiredAt: string | null;
}

export interface SponsorListQuery extends OffsetPagination {
  search?: string;
  relationship?: "supported" | "available";
}
