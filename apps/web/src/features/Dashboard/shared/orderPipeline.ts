import type { DashboardStatusCount } from "../types";

export const ACTIVE_ORDER_PIPELINE_STAGES = [
  "pending",
  "approved",
  "in_preparation",
  "purchased",
  "out_for_delivery",
  "delivered",
] as const;

export function retainOrderPipelineStages(
  counts: DashboardStatusCount[],
): DashboardStatusCount[] {
  const countsByStatus = new Map(counts.map((entry) => [entry.status, entry.count]));
  const activeStages = new Set<string>(ACTIVE_ORDER_PIPELINE_STAGES);

  return [
    ...ACTIVE_ORDER_PIPELINE_STAGES.map((status) => ({
      status,
      count: countsByStatus.get(status) ?? 0,
    })),
    ...counts.filter(({ status }) => !activeStages.has(status)),
  ];
}
