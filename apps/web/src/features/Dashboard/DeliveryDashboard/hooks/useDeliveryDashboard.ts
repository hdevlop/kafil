"use client";

import { keepPreviousData } from "@tanstack/react-query";

import { deliveryOrderKeys } from "@/features/Orders/hooks/deliveryOrderKeys";
import { useEntityCommand, useEntityQuery } from "najm-kit/query";
import { getDeliveryDashboard } from "@/services/dashboardApi";
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
    placeholderData: keepPreviousData,
  });
}

export function useDeliveryDashboardCommands(date: string) {
  const invalidate = [
    dashboardKeys.delivery(date),
    dashboardKeys.deliveryFamilies,
    deliveryOrderKeys.all,
  ];
  return {
    start: useEntityCommand({ mutationFn: startOwnOrderDelivery, invalidate }),
    confirm: useEntityCommand({ mutationFn: confirmOwnOrderDelivery, invalidate }),
    reportIssue: useEntityCommand({ mutationFn: reportOwnOrderDeliveryIssue, invalidate }),
  };
}
