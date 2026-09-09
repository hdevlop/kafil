"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { getDeliveryDashboard, getDeliveryDashboardContext } from "@/services/dashboardApi";
import {
  confirmOwnOrderDelivery,
  reportOwnOrderDeliveryIssue,
  startOwnOrderDelivery,
} from "@/services/orderApi";

import { dashboardKeys } from "../../shared/dashboardKeys";

export function useDeliveryDashboard(date: string) {
  return useEntityQuery({
    queryKey: dashboardKeys.delivery(date),
    queryFn: () => getDeliveryDashboard(date),
  });
}

export function useDeliveryDashboardContext(enabled = true) {
  return useEntityQuery({
    queryKey: dashboardKeys.deliveryContext,
    queryFn: getDeliveryDashboardContext,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useDeliveryDashboardCommands(date: string) {
  const invalidate = [dashboardKeys.delivery(date)];
  return {
    start: useEntityCommand({ mutationFn: startOwnOrderDelivery, invalidate }),
    confirm: useEntityCommand({ mutationFn: confirmOwnOrderDelivery, invalidate }),
    reportIssue: useEntityCommand({ mutationFn: reportOwnOrderDeliveryIssue, invalidate }),
  };
}
