import type { SponsorDashboardData } from "@/features/Dashboard/SponsorDashboard/types";

import { api } from "./http";

export function getSponsorDashboard() {
  return api.get<SponsorDashboardData>("/dashboard/sponsor");
}
