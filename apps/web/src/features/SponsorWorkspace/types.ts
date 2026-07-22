import type { OffsetPagination } from "@/lib/pagination";
import type { FamilyFundingProgress } from "@/types/funding";

export interface SponsorSupportAssignment { id: string; familyProfileId: string; childId: string | null; status: string; startedAt: string; endedAt: string | null; }
export interface SponsorSupportSummary { assignment: SponsorSupportAssignment; target: { label: string; detail: string; reference: string }; }
export interface SponsorFamilyCatalogEntry { id: string; image: string | null; reference: string; activeChildCount: number; funding: FamilyFundingProgress | null; }
export interface SponsorContributionPlan { id: string; supportAssignmentId: string; kind: "monthly" | "one_time" | string; amountMinor: number; currency: string; status: "active" | "paused" | "stopped" | string; startsAt: string; nextDueAt: string | null; }
export interface SponsorContribution { id: string; supportAssignmentId: string; amountMinor: number; currency: string; paymentMethod: string; externalReference: string | null; status: string; submittedAt: string; paidAt: string | null; }
export interface SponsorBudgetSummary { currency: string; validatedMinor: number; supportedBudgets: Array<{ supportReference: string; availableMinor: number; reservedMinor: number; spentMinor: number; remainingMinor: number; currency: string; funding: FamilyFundingProgress | null }>; }
export interface SponsorSupportedOrder { id: string; orderNumber: string; status: string; totalMinor: number; currency: string; placedAt: string; approvedAt: string | null; preparationStartedAt: string | null; deliveredAt: string | null; items: Array<{ productName: string; sku: string; quantity: number; unitPriceMinor: number; lineTotalMinor: number }>; }
export type SponsorListQuery = OffsetPagination;
