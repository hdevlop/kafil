import type { BadgeColor } from "najm-kit";

export const KAFIL_STATUS_COLORS: Record<string, BadgeColor> = {
  active: "success",
  approved: "success",
  completed: "success",
  delivered: "success",
  validated: "success",

  pending: "warning",
  in_preparation: "warning",

  paused: "info",

  inactive: "neutral",
  stopped: "neutral",
  cancelled: "neutral",

  rejected: "destructive",
  refunded: "destructive",
};

export function getStatusColor(status: string): BadgeColor {
  return KAFIL_STATUS_COLORS[status] ?? "neutral";
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  validated: "text-emerald-700 dark:text-emerald-400",
  pending: "text-amber-600 dark:text-amber-400",
  rejected: "text-red-600 dark:text-red-400",
  refunded: "text-red-600 dark:text-red-400",
};

export function getStatusTextColor(status: string): string {
  return STATUS_TEXT_COLORS[status] ?? "";
}
