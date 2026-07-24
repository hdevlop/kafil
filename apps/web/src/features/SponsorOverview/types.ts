import type { LucideIcon } from "lucide-react";

export interface SponsorKpiItem {
  key: string;
  icon: LucideIcon;
  label: string;
  subtext?: string;
  value: string;
  link?: string;
}

export interface BudgetSegment {
  label: string;
  value: number;
  color: string;
}

export interface ContributionTrendPoint {
  month: string;
  [key: string]: number | string;
}

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface ContributionEntry {
  id: string;
  status: string;
  amountMinor: number;
  submittedAt: string;
}

export interface OrderEntry {
  id: string;
  orderNumber: string;
  status: string;
  totalMinor: number;
  placedAt: string;
  itemCount: number;
}

export interface UpcomingPlanEntry {
  planId: string;
  amountMinor: number;
  dueAt: string;
  supportReference: string;
}
