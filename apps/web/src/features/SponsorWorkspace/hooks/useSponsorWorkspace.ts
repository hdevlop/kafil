"use client";
import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { changeSponsorPlan, createSponsorPlan, getSponsorBudgetSummary, listSponsorContributions, listSponsorFamilyCatalog, listSponsorOrders, listSponsorPlans, listSponsorSupport, selectSponsorFamily, submitSponsorContribution } from "@/services/sponsorWorkspaceApi";
import type { SponsorListQuery } from "../types";
const keys = { all: ["sponsor-workspace"] as const, catalog: ["sponsor-workspace", "catalog"] as const, support: ["sponsor-workspace", "support"] as const, plans: (q: SponsorListQuery) => ["sponsor-workspace", "plans", q] as const, contributions: (q: SponsorListQuery) => ["sponsor-workspace", "contributions", q] as const, budget: ["sponsor-workspace", "budget"] as const, orders: (q: SponsorListQuery) => ["sponsor-workspace", "orders", q] as const };
export function useSponsorFamilyCatalog() { return useEntityQuery({ queryKey: keys.catalog, queryFn: listSponsorFamilyCatalog }); }
export function useSponsorSupport() { return useEntityQuery({ queryKey: keys.support, queryFn: listSponsorSupport }); }
export function useSponsorPlans(q: SponsorListQuery) { return useEntityQuery({ queryKey: keys.plans(q), queryFn: () => listSponsorPlans(q) }); }
export function useSponsorContributions(q: SponsorListQuery) { return useEntityQuery({ queryKey: keys.contributions(q), queryFn: () => listSponsorContributions(q) }); }
export function useSponsorBudget() { return useEntityQuery({ queryKey: keys.budget, queryFn: getSponsorBudgetSummary }); }
export function useSponsorOrders(q: SponsorListQuery) { return useEntityQuery({ queryKey: keys.orders(q), queryFn: () => listSponsorOrders(q) }); }
export function useSponsorContributionCommands() { const invalidate = [keys.all]; return { createPlan: useEntityCommand({ mutationFn: createSponsorPlan, invalidate, successMessage: "Contribution plan created.", errorMessage: "Could not create this plan." }), submit: useEntityCommand({ mutationFn: submitSponsorContribution, invalidate, successMessage: "Contribution submitted for validation.", errorMessage: "Could not submit this contribution." }), changePlan: useEntityCommand({ mutationFn: changeSponsorPlan, invalidate, successMessage: "Contribution plan updated.", errorMessage: "Could not update this plan." }) }; }
export function useSponsorFamilySupportCommand() { return useEntityCommand({ mutationFn: selectSponsorFamily, invalidate: [keys.all], successMessage: "Family selected for support.", errorMessage: "Could not select this family for support." }); }
