import type { LucideIcon } from "lucide-react";

export interface SponsorRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  status: "active" | "inactive" | string;
  role: string | null;
  phone: string | null;
  cin: string | null;
  gender: "F" | "M" | null;
  address: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorProfileInput {
  phone: string;
  cin: string;
  gender: "F" | "M";
  address: string;
  dateOfBirth: string;
  notes?: string | null;
}

export interface CreateSponsorInput extends SponsorProfileInput {
  name: string;
  email: string;
  image?: string | null;
}

export interface UpdateSponsorInput {
  name: string;
  email: string;
  image?: string | null;
  phone?: string;
  cin?: string;
  gender?: "F" | "M";
  address?: string;
  dateOfBirth?: string;
  notes?: string | null;
}

export interface SponsorStatusInput {
  id: string;
  reason: string;
}

export interface CreatedSponsorRecord extends SponsorRecord {
  initialPassword: string;
}

export interface OperatorSponsorOverviewData {
  sponsor: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    status: string;
    phone: string | null;
    cin: string | null;
    gender: "F" | "M" | null;
    address: string | null;
    dateOfBirth: string | null;
    notes: string | null;
    createdAt: string;
  };
  metrics: {
    counts: {
      activeSupportedFamilies: number;
      activePlans: number;
      pendingContributions: number;
      supportedOrders: number;
    };
    money: {
      validatedContributionMinor: number;
      pendingContributionMinor: number;
      supportedAvailableMinor: number;
      supportedReservedMinor: number;
      supportedSpentMinor: number;
    };
    nextPlannedContribution: {
      planId: string;
      amountMinor: number;
      dueAt: string;
    } | null;
    contributionTrend: Array<{
      month: string;
      validatedMinor: number;
      pendingMinor: number;
    }>;
    recentContributions: Array<{
      id: string;
      status: string;
      amountMinor: number;
      submittedAt: string;
    }>;
    recentSupportedOrders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      totalMinor: number;
      placedAt: string;
      itemCount: number;
    }>;
  };
}

export interface OwnSponsorProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  status: "active" | "inactive" | string;
  role: string | null;
  phone: string | null;
  cin: string | null;
  gender: "F" | "M" | null;
  address: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOwnSponsorProfileInput {
  image?: string | null;
  phone: string;
  cin: string;
  gender: "F" | "M";
  address: string;
  dateOfBirth: string;
}

export interface UpdateOwnSponsorProfileInput {
  image?: string | null;
  phone?: string;
  cin?: string;
  gender?: "F" | "M";
  address?: string;
  dateOfBirth?: string;
}

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
  color?: string;
}

export interface ContributionTrendPoint {
  month: string;
  [key: string]: number | string;
}

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
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
