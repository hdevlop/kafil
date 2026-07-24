import { HandCoins, HeartHandshake, UserRound } from "lucide-react";

import type { KafilLanguage } from "@/lib/format";
import { formatKafilDate, formatKafilNumber, formatMad } from "@/lib/format";
import type { SponsorKpiItem, ChartSeries } from "@/features/SponsorOverview";
import type { OperatorSponsorOverviewData } from "../types";
import type { SponsorInfoViewModel } from "../components/SponsorInformationCard";

export interface OperatorSponsorOverviewViewModel {
  kpis: SponsorKpiItem[];
  sponsorInfo: SponsorInfoViewModel;
  budgetSegments: Array<{ label: string; value: number; color: string }>;
  budgetTotal: number;
  contributionTrend: OperatorSponsorOverviewData["metrics"]["contributionTrend"];
  chartSeries: ChartSeries[];
  recentContributions: OperatorSponsorOverviewData["metrics"]["recentContributions"];
  recentSupportedOrders: OperatorSponsorOverviewData["metrics"]["recentSupportedOrders"];
  contributionValueFormatter: (value: number) => string;
}

export function buildOperatorSponsorOverviewViewModel(
  data: OperatorSponsorOverviewData,
  language: KafilLanguage,
  t: (key: string, params?: Record<string, string>) => string,
): OperatorSponsorOverviewViewModel {
  const money = (value: number) => formatMad(value, language);
  const number = (value: number) => formatKafilNumber(value, language);

  const kpis: SponsorKpiItem[] = [
    {
      key: "activeSupportedFamilies",
      icon: HeartHandshake,
      label: t("dashboard.sponsor.supportedFamilies"),
      value: number(data.metrics.counts.activeSupportedFamilies),
      subtext: t("dashboard.sponsor.activeSupport"),
    },
    {
      key: "validatedContribution",
      icon: HandCoins,
      label: t("dashboard.sponsor.validatedContributions"),
      value: money(data.metrics.money.validatedContributionMinor),
      subtext: t("dashboard.common.validated"),
    },
    {
      key: "pendingContributions",
      icon: HandCoins,
      label: t("dashboard.sponsor.pendingContributions"),
      value: money(data.metrics.money.pendingContributionMinor),
      subtext: `${number(data.metrics.counts.pendingContributions)} ${t("dashboard.sponsor.pendingCount")}`,
    },
    {
      key: "memberSince",
      icon: UserRound,
      label: t("dashboard.sponsor.memberSince"),
      value: formatKafilDate(data.sponsor.createdAt, language),
    },
  ];

  const budgetTotal = data.metrics.money.supportedAvailableMinor
    + data.metrics.money.supportedReservedMinor
    + data.metrics.money.supportedSpentMinor;

  const budgetSegments = [
    { label: t("dashboard.common.available"), value: data.metrics.money.supportedAvailableMinor, color: "var(--primary)" },
    { label: t("dashboard.common.reserved"), value: data.metrics.money.supportedReservedMinor, color: "var(--secondary)" },
    { label: t("dashboard.common.spent"), value: data.metrics.money.supportedSpentMinor, color: "var(--destructive)" },
  ];

  return {
    kpis,
    sponsorInfo: {
      name: data.sponsor.name,
      email: data.sponsor.email,
      image: data.sponsor.image,
      status: data.sponsor.status,
      phone: data.sponsor.phone,
      cin: data.sponsor.cin,
      gender: data.sponsor.gender,
      address: data.sponsor.address,
      dateOfBirth: data.sponsor.dateOfBirth
        ? formatKafilDate(data.sponsor.dateOfBirth, language)
        : null,
      notes: data.sponsor.notes,
      createdAt: data.sponsor.createdAt,
    },
    budgetSegments,
    budgetTotal,
    contributionTrend: data.metrics.contributionTrend,
    chartSeries: [
      { key: "validatedMinor", label: t("dashboard.common.validated"), color: "var(--primary)" },
      { key: "pendingMinor", label: t("dashboard.common.pending"), color: "var(--secondary)" },
    ],
    recentContributions: data.metrics.recentContributions,
    recentSupportedOrders: data.metrics.recentSupportedOrders,
    contributionValueFormatter: money,
  };
}
