import { Calendar, ClipboardCheck, HandCoins, HeartHandshake, UserRound } from "lucide-react";

import type { KafilLanguage } from "@/lib/format";
import { formatKafilDate, formatKafilNumber, formatMad } from "@/lib/format";
import type { SponsorKpiItem } from "@/features/SponsorOverview/types";

import type { SponsorDashboardData } from "../types";

export interface SponsorDashboardViewModel {
  kpis: SponsorKpiItem[];
  displayName: string;
  supportedFamilies: SponsorDashboardData["supportedFamilies"];
  budgetSegments: Array<{ label: string; value: number; color: string }>;
  budgetTotal: number;
  contributionTrend: SponsorDashboardData["contributionTrend"];
  recentContributions: SponsorDashboardData["recentContributions"];
  recentSupportedOrders: SponsorDashboardData["recentSupportedOrders"];
  upcomingContributions: SponsorDashboardData["upcomingContributions"];
  hasMoreFamilies: boolean;
}

export function buildSponsorDashboardViewModel(
  data: SponsorDashboardData,
  language: KafilLanguage,
  t: (key: string, params?: Record<string, string>) => string,
): SponsorDashboardViewModel {
  const money = (value: number) => formatMad(value, language);
  const number = (value: number) => formatKafilNumber(value, language);

  const kpis: SponsorKpiItem[] = [
    {
      key: "activeSupportedFamilies",
      icon: HeartHandshake,
      label: t("dashboard.sponsor.supportedFamilies"),
      value: number(data.counts.activeSupportedFamilies),
      subtext: t("dashboard.sponsor.activeSupport"),
      link: "/sponsor/support",
    },
    {
      key: "validatedContribution",
      icon: HandCoins,
      label: t("dashboard.sponsor.validatedContributions"),
      value: money(data.money.validatedContributionMinor),
      subtext: t("dashboard.common.validated"),
      link: "/sponsor/contributions",
    },
    {
      key: "nextContribution",
      icon: Calendar,
      label: t("dashboard.sponsor.nextContribution"),
      value: data.nextPlannedContribution
        ? money(data.nextPlannedContribution.amountMinor)
        : t("dashboard.sponsor.noActivePlan"),
      subtext: data.nextPlannedContribution
        ? formatKafilDate(data.nextPlannedContribution.dueAt, language)
        : undefined,
      link: "/sponsor/contributions",
    },
    {
      key: "supportedOrders",
      icon: ClipboardCheck,
      label: t("dashboard.sponsor.supportedOrders"),
      value: number(data.counts.supportedOrders),
      link: "/orders",
    },
    {
      key: "memberSince",
      icon: UserRound,
      label: t("dashboard.sponsor.memberSince"),
      value: formatKafilDate(data.memberSince, language),
    },
  ];

  const budgetTotal = data.money.supportedAvailableMinor + data.money.supportedReservedMinor + data.money.supportedSpentMinor;

  const budgetSegments = [
    { label: t("dashboard.common.available"), value: data.money.supportedAvailableMinor, color: "var(--primary)" },
    { label: t("dashboard.common.reserved"), value: data.money.supportedReservedMinor, color: "var(--secondary)" },
    { label: t("dashboard.common.spent"), value: data.money.supportedSpentMinor, color: "var(--destructive)" },
  ];

  return {
    kpis,
    displayName: data.displayName,
    supportedFamilies: data.supportedFamilies.slice(0, 3),
    budgetSegments,
    budgetTotal,
    contributionTrend: data.contributionTrend,
    recentContributions: data.recentContributions,
    recentSupportedOrders: data.recentSupportedOrders,
    upcomingContributions: data.upcomingContributions,
    hasMoreFamilies: data.supportedFamilies.length > 3,
  };
}
