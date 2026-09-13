import type {
  FamilyDashboardData,
  DeliveryDashboardData,
  OperatorDashboardData,
} from "@/features/Dashboard/types";
import type { DeliveryFamilyView } from "@/features/Families/types";
import type { OffsetPagination } from "najm-kit/pagination";

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

export interface ListDeliveryFamiliesFilters {
  date: string;
  search?: string;
}

export function listDeliveryFamilies(
  pagination: OffsetPagination,
  filters: ListDeliveryFamiliesFilters,
) {
  return api.getPage<DeliveryFamilyView>("/dashboard/delivery/families", {
    query: {
      limit: pagination.limit,
      offset: pagination.offset,
      date: filters.date,
      ...(filters.search ? { search: filters.search } : {}),
    },
  });
}
