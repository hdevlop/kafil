import type { SponsorContribution, SponsorContributionPlan, SponsorFamilyCatalogEntry, SponsorListQuery, SponsorSupportAssignment } from "@/features/Contributions/lib/sponsorTypes";
import { api } from "@/services/http";

export function listSponsorFamilyCatalog(query: SponsorListQuery) {
  return api.get<SponsorFamilyCatalogEntry[]>("/support-assignments/catalog", {
    query: {
      limit: query.limit,
      offset: query.offset,
      search: query.search,
      relationship: query.relationship,
    },
  });
}
export function selectSponsorFamily(input: { familyProfileId: string }) { return api.post<SponsorSupportAssignment>("/support-assignments/me", input); }
export function listSponsorPlans(query: SponsorListQuery) { return api.get<SponsorContributionPlan[]>("/contributions/me/plans", { query: { limit: query.limit, offset: query.offset } }); }
export function listSponsorContributions(query: SponsorListQuery) { return api.get<SponsorContribution[]>("/contributions/me", { query: { limit: query.limit, offset: query.offset } }); }
export function createSponsorPlan(input: { supportAssignmentId: string; kind: "monthly" | "one_time"; amountMinor: number }) { return api.post<SponsorContributionPlan>("/contributions/me/plans", input); }
export function submitSponsorContribution(input: { supportAssignmentId: string; amountMinor: number; paymentMethod: string }) { return api.post<SponsorContribution>("/contributions/me", input); }
export function changeSponsorPlan(input: { id: string; action: "pause" | "resume" | "stop"; reason: string }) { return api.post<SponsorContributionPlan>(`/contributions/me/plans/${input.id}/${input.action}`, { reason: input.reason }); }
