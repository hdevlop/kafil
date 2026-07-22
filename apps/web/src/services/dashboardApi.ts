import type {
  FamilyDashboardData,
  OperatorDashboardData,
  SponsorDashboardData,
} from "@/features/Dashboard/types";

import { api } from "./http";

export function getOperatorDashboard() {
  return api.get<OperatorDashboardData>("/dashboard/operator");
}

export function getFamilyDashboard() {
  return api.get<FamilyDashboardData>("/dashboard/family");
}

export function getSponsorDashboard() {
  return api.get<SponsorDashboardData>("/dashboard/sponsor");
}
