import type {
  FamilyChildRecord,
  FamilyDashboardProfile,
} from "@/features/FamilyDashboard/types";
import { api } from "@/services/http";

export function getOwnFamilyProfile() {
  return api.get<FamilyDashboardProfile>("/families/me");
}

export function listOwnFamilyChildren() {
  return api.get<FamilyChildRecord[]>("/children/me");
}
