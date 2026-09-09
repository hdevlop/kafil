import type {
  FamilyDashboardData,
  DeliveryDashboardData,
  OperatorDashboardData,
} from "@/features/Dashboard/types";

import { api } from "./http";

export function getOperatorDashboard() {
  return api.get<OperatorDashboardData>("/dashboard/operator");
}

export function getFamilyDashboard() {
  return api.get<FamilyDashboardData>("/dashboard/family");
}

export function getDeliveryDashboard(date: string) {
  return api.get<DeliveryDashboardData>("/dashboard/delivery", {
    query: { date },
  });
}

export function getDeliveryDashboardContext() {
  return api.get<{ eligible: boolean; staffProfileId: string | null }>(
    "/dashboard/delivery/context",
  );
}
