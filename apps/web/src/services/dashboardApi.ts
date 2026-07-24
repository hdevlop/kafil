import type {
  FamilyDashboardData,
  OperatorDashboardData,
} from "@/features/Dashboard/types";

import { api } from "./http";

export function getOperatorDashboard() {
  return api.get<OperatorDashboardData>("/dashboard/operator");
}

export function getFamilyDashboard() {
  return api.get<FamilyDashboardData>("/dashboard/family");
}
