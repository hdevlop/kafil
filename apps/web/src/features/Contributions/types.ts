import type { OffsetPagination } from "@/lib/pagination";
import type { FamilyFundingProgress } from "@/types/funding";

export type ContributionStatus =
  | "pending"
  | "validated"
  | "rejected"
  | "refunded"
  | "expired";

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
  familyImage: string | null;
  amountMinor: number;
  currency: "MAD" | string;
  paymentMethod: string;
  externalReference: string | null;
  status: ContributionStatus | string;
  submittedAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  expiredAt: string | null;
  validatedByUserId: string | null;
  validatedAt: string | null;
  rejectedByUserId: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyContributionRecord {
  id: string;
  sponsorName: string;
  sponsorImage: string | null;
  sponsorGender: "F" | "M" | null;
  amountMinor: number;
  currency: "MAD" | string;
  externalReference: string | null;
  status: ContributionStatus | string;
  submittedAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  expiredAt: string | null;
  validatedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
}

export interface SponsorContributionRecord {
  id: string;
  contributionPlanId: string | null;
  supportAssignmentId: string;
  amountMinor: number;
  currency: "MAD" | string;
  paymentMethod: string;
  externalReference: string | null;
  status: ContributionStatus | string;
  submittedAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  expiredAt: string | null;
  validatedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
}

export type ContributionListRecord =
  | ContributionRecord
  | FamilyContributionRecord
  | SponsorContributionRecord;
export type ContributionAudience = "management" | "family" | "sponsor";

export type ContributionListQuery = OffsetPagination & {
  audience?: ContributionAudience;
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
  funding: FamilyFundingProgress | null;
}

export interface ContributionLedgerEntry {
  id: string;
  amountMinor: number;
  entryType: string;
}

export type ContributionCommandResult =
  | ContributionRecord
  | { contribution: ContributionRecord; ledgerEntry: ContributionLedgerEntry };
