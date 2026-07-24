import type { SponsorDashboardData } from "@/features/SponsorDashboard/types";

import { api } from "./http";

export function getSponsorDashboard() {
  return api.get<SponsorDashboardData>("/dashboard/sponsor");
}
