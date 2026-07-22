import type { SponsorBudgetSummary, SponsorContribution, SponsorContributionPlan, SponsorFamilyCatalogEntry, SponsorListQuery, SponsorSupportedOrder, SponsorSupportAssignment, SponsorSupportSummary } from "@/features/SponsorWorkspace/types";
import { api } from "@/services/http";

export async function listSponsorSupport() {
  const assignments = await api.get<SponsorSupportAssignment[]>("/support-assignments/me", { query: { limit: 100, offset: 0 } });
  return Promise.all(assignments.map(async (assignment) => {
    if (assignment.status !== "active") return { assignment, target: { label: "Ended support", detail: "This support relationship has ended.", reference: assignment.id.slice(0, 8) } } satisfies SponsorSupportSummary;
    const path = assignment.childId ? `/support-assignments/me/${assignment.id}/child` : `/support-assignments/me/${assignment.id}/family`;
    const summary = await api.get<{ child?: { label: string; ageBand: string }; family?: { reference: string; activeChildCount: number } }>(path);
    return assignment.childId ? { assignment, target: { label: summary.child?.label || "Supported child", detail: summary.child?.ageBand || "Privacy-safe child summary", reference: assignment.id.slice(0, 8) } } : { assignment, target: { label: summary.family?.reference || "Supported family", detail: `${summary.family?.activeChildCount || 0} active children`, reference: assignment.id.slice(0, 8) } };
  }));
}
export function listSponsorFamilyCatalog() { return api.get<SponsorFamilyCatalogEntry[]>("/support-assignments/catalog", { query: { limit: 100, offset: 0 } }); }
export function selectSponsorFamily(input: { familyProfileId: string }) { return api.post<SponsorSupportAssignment>("/support-assignments/me", input); }
export function listSponsorPlans(query: SponsorListQuery) { return api.get<SponsorContributionPlan[]>("/contributions/me/plans", { query: { limit: query.limit, offset: query.offset } }); }
export function listSponsorContributions(query: SponsorListQuery) { return api.get<SponsorContribution[]>("/contributions/me", { query: { limit: query.limit, offset: query.offset } }); }
export function getSponsorBudgetSummary() { return api.get<SponsorBudgetSummary>("/contributions/me/summary"); }
export function listSponsorOrders(query: SponsorListQuery) { return api.get<SponsorSupportedOrder[]>("/orders/supported", { query: { limit: query.limit, offset: query.offset } }); }
export function createSponsorPlan(input: { supportAssignmentId: string; kind: "monthly" | "one_time"; amountMinor: number }) { return api.post<SponsorContributionPlan>("/contributions/me/plans", input); }
export function submitSponsorContribution(input: { supportAssignmentId: string; amountMinor: number; paymentMethod: string }) { return api.post<SponsorContribution>("/contributions/me", input); }
export function changeSponsorPlan(input: { id: string; action: "pause" | "resume" | "stop"; reason: string }) { return api.post<SponsorContributionPlan>(`/contributions/me/plans/${input.id}/${input.action}`, { reason: input.reason }); }
