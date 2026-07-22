import type { OffsetPagination } from "@/lib/pagination";

export type ContributionStatus =
  | "pending"
  | "validated"
  | "rejected"
  | "refunded";

export interface ContributionRecord {
  id: string;
  contributionPlanId: string | null;
  supportAssignmentId: string;
  sponsorProfileId: string;
  familyProfileId: string;
  sponsorName: string;
  sponsorImage: string | null;
  sponsorGender: "F" | "M" | null;
  sponsorEmail: string;
  familyName: string;
  amountMinor: number;
  currency: "MAD" | string;
  paymentMethod: string;
  externalReference: string | null;
  status: ContributionStatus | string;
  submittedAt: string;
  paidAt: string | null;
  validatedByUserId: string | null;
  validatedAt: string | null;
  rejectedByUserId: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ContributionListQuery = OffsetPagination & {
  familyProfileId?: string;
  status?: ContributionStatus;
};

export interface ContributionReasonInput {
  id: string;
  reason: string;
}

export interface RecordContributionInput {
  supportAssignmentId: string;
  amountMinor: number;
  paymentMethod: string;
  externalReference?: string;
  paidAt: string;
}

export interface ContributionRecordingOption {
  id: string;
  sponsorProfileId: string;
  familyProfileId: string;
  sponsorName: string;
  sponsorEmail: string;
  familyName: string;
}

export interface ContributionLedgerEntry {
  id: string;
  amountMinor: number;
  entryType: string;
}

export type ContributionCommandResult =
  | ContributionRecord
  | { contribution: ContributionRecord; ledgerEntry: ContributionLedgerEntry };
