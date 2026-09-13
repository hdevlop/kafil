"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClockAlert,
  Clock3,
  ExternalLink,
  FileWarning,
  MapPin,
  MapPinned,
  Package,
  PackageCheck,
  Phone,
  PhoneOff,
  Play,
  Truck,
  UsersRound,
} from "lucide-react";
import {
  DateInput,
  NAvatar,
  NBadge,
  NButton,
  NCard,
  NCardAction,
  NErrorState,
  NGrid,
  NGridItem,
  NativeSelect,
  NPageHeader,
  NPageHeaderActions,
  NPageLayout,
  NPieChart,
  NStatCard,
  useNajmFormat,
} from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { getPublicApiErrorMessage } from "@/services/apiError";
import { DashboardAttentionCard } from "../../shared/DashboardAttentionCard";
import { DashboardQuickActionsCard } from "../../shared/DashboardQuickActionsCard";
import { DeliveryDashboardSkeleton } from "../../shared/DashboardSkeletons";
import type { DeliveryDashboardItem } from "../../types";
import { useDeliveryDashboard, useDeliveryDashboardCommands } from "../hooks/useDeliveryDashboard";

const DeliveryMap = dynamic(() => import("./DeliveryMap").then((module) => module.DeliveryMap), {
  ssr: false,
  loading: () => <div className="h-[34rem] animate-pulse rounded-xl bg-muted" />,
});

function casablancaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function minuteLabel(value: number | null) {
  if (value == null) return "—";
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function categoryKey(category: DeliveryDashboardItem["category"]) {
  return category === "needs_attention"
    ? "dashboard.delivery.needsAttention" as const
    : category === "delivered"
      ? "dashboard.delivery.delivered" as const
      : "dashboard.delivery.pending" as const;
}

export function DeliveryDashboardPage() {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  const [date, setDate] = useState(() => casablancaDate());
  const today = casablancaDate();
  const dashboard = useDeliveryDashboard(date);
  const commands = useDeliveryDashboardCommands(date);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [issueKind, setIssueKind] = useState<"address_confirmation" | "family_unreachable" | "missing_proof">("address_confirmation");

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has("date")) return;

    currentUrl.searchParams.delete("date");
    window.history.replaceState(window.history.state, "", currentUrl);
  }, []);

  const items = dashboard.data?.deliveries ?? [];
  const selected = items.find((item) => item.attemptId === selectedId) ?? items[0] ?? null;
  const effectiveSelectedId = selected?.attemptId ?? null;
  const onSelect = useCallback((id: string) => setSelectedId(id), []);

  function changeDate(next: string | undefined) {
    if (!next) return;
    setSelectedId(null);
    setShowAll(false);
    setDate(next);
  }

  async function start(item: DeliveryDashboardItem) {
    await commands.start.mutateAsync({ id: item.orderId, idempotencyKey: crypto.randomUUID() });
  }

  async function confirm(item: DeliveryDashboardItem) {
    await commands.confirm.mutateAsync({
      id: item.orderId,
      confirmationMethod: "operator_confirmation",
      idempotencyKey: crypto.randomUUID(),
    });
  }

  async function reportIssue(item: DeliveryDashboardItem) {
    await commands.reportIssue.mutateAsync({
      id: item.orderId,
      attemptId: item.attemptId,
      kind: issueKind,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  if (dashboard.isError) {
    return (
      <NErrorState
        title={t("dashboard.delivery.error")}
        message={getPublicApiErrorMessage(dashboard.error, t("state.retry"))}
        onRetry={() => void dashboard.refetch()}
        surface="panel"
      />
    );
  }

  if (dashboard.isPending || !dashboard.data) {
    return (
      <DeliveryDashboardSkeleton
        loadingLabel={t("state.loading")}
        title={t("dashboard.delivery.title")}
      />
    );
  }

  const data = dashboard.data;
  const counts = data.counts;
  const chartItems = [
    { id: "delivered", label: t("dashboard.delivery.delivered"), value: counts.delivered, color: "#16a34a" },
    { id: "pending", label: t("dashboard.delivery.pending"), value: counts.pending, color: "#0891b2" },
    { id: "attention", label: t("dashboard.delivery.needsAttention"), value: counts.needsAttention, color: "#ea580c" },
  ];
  const statCards = [
    { icon: Package, key: "assigned" as const, value: counts.assigned },
    { icon: Clock3, key: "pending" as const, value: counts.pending },
    { icon: PackageCheck, key: "delivered" as const, value: counts.delivered },
    { icon: AlertTriangle, key: "needsAttention" as const, value: counts.needsAttention },
    { icon: UsersRound, key: "familiesToday" as const, value: counts.families },
    { icon: Package, key: "packagesRemaining" as const, value: counts.packagesRemaining },
  ];
  const attentionRows = [
    { icon: MapPinned, id: "address-to-confirm", key: "addressToConfirm" as const, tone: "bg-amber-500", value: data.issueCounts.addressToConfirm },
    { icon: PhoneOff, id: "family-unreachable", key: "familyUnreachable" as const, tone: "bg-sky-500", value: data.issueCounts.familyUnreachable },
    { icon: FileWarning, id: "missing-proof", key: "missingProof" as const, tone: "bg-violet-500", value: data.issueCounts.missingProof },
    { icon: ClockAlert, id: "delayed", key: "delayed" as const, tone: "bg-rose-500", value: data.issueCounts.delayed },
  ];
  const quickActions = [
    {
      description: t("dashboard.delivery.viewDeliveriesHint"),
      icon: Truck,
      id: "view-deliveries",
      label: t("dashboard.delivery.viewDeliveries"),
      onClick: () => document.getElementById("delivery-list")?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      description: t("dashboard.delivery.confirmDeliveryHint"),
      disabled: !selected?.canConfirm || commands.confirm.isPending,
      icon: CheckCircle2,
      id: "confirm-delivery",
      label: t("dashboard.delivery.confirmDelivery"),
      onClick: () => { if (selected?.canConfirm) void confirm(selected); },
    },
    {
      description: t("dashboard.delivery.callFamilyHint"),
      disabled: !selected?.phone,
      icon: Phone,
      id: "call-family",
      label: t("dashboard.delivery.callFamily"),
      onClick: () => { if (selected?.phone) window.location.href = `tel:${selected.phone}`; },
    },
    {
      description: t("dashboard.delivery.reportIssueHint"),
      disabled: !selected?.canReportIssue || commands.reportIssue.isPending,
      icon: AlertTriangle,
      id: "report-issue",
      label: t("dashboard.delivery.reportIssue"),
      onClick: () => { if (selected?.canReportIssue) void reportIssue(selected); },
    },
  ];

  return (
    <NPageLayout className="flex min-h-full flex-col gap-4">
      <NPageHeader card icon={Truck} title={t("dashboard.delivery.title")} subtitle={t("dashboard.delivery.subtitle")}>
        <NPageHeaderActions><PageHeaderGlobalActions /></NPageHeaderActions>
      </NPageHeader>

      <NGrid cols={2} lgCols={3} xlCols={6}>
        {statCards.map(({ icon: Icon, key, value }) => (
          <NGridItem key={key} span={1}>
            <NStatCard variant="compact" icon={Icon} label={t(`dashboard.delivery.${key}`)} value={fmt.number(value)} className="sm:hidden" />
            <NStatCard icon={Icon} label={t(`dashboard.delivery.${key}`)} value={fmt.number(value)} className="hidden sm:block" />
          </NGridItem>
        ))}
      </NGrid>

      <div className="grid flex-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="grid content-stretch gap-4 md:grid-cols-2 xl:col-span-6">
          <NPieChart
            className="h-full min-h-72"
            title={t("dashboard.delivery.overview")}
            icon={PackageCheck}
            items={chartItems}
            emptyLabel={t("dashboard.delivery.noDeliveries")}
            valueFormatter={fmt.number}
          />

          <div id="delivery-list" className="h-full">
            <NCard
              className="h-full min-h-72"
              title={t("dashboard.delivery.todaysDeliveries")}
              icon={Truck}
              empty={items.length === 0}
              emptyText={t("dashboard.delivery.noDeliveries")}
            >
              <div className="space-y-1">
                {(showAll ? items : items.slice(0, 5)).map((item) => (
                  <NButton
                    key={item.attemptId}
                    variant={item.attemptId === effectiveSelectedId ? "secondary" : "ghost"}
                    className="h-auto w-full justify-start gap-3 px-2 py-2 text-start"
                    onClick={() => onSelect(item.attemptId)}
                  >
                    <NAvatar fallback={item.familyName} src={item.familyImage} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{item.orderNumber}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">{item.familyName}</span>
                    </span>
                    <span className="shrink-0 text-xs font-normal text-muted-foreground">
                      {minuteLabel(item.windowStartMinute)}–{minuteLabel(item.windowEndMinute)}
                    </span>
                    <NBadge status={item.category}>{t(categoryKey(item.category))}</NBadge>
                  </NButton>
                ))}
                {items.length > 5 ? (
                  <NButton variant="outline" className="w-full" onClick={() => setShowAll((current) => !current)}>
                    {showAll ? t("dashboard.delivery.showLess") : t("dashboard.delivery.viewAll")}
                  </NButton>
                ) : null}
              </div>
            </NCard>
          </div>

          <DashboardAttentionCard
            allClearLabel={t("dashboard.operator.allClear")}
            icon={AlertTriangle}
            items={attentionRows.map(({ key, ...item }) => ({
              ...item,
              label: t(`dashboard.delivery.${key}`),
            }))}
            title={t("dashboard.delivery.attentionTitle")}
          >
            {selected ? (
              <div className="mt-4 border-t pt-4">
                <NAvatar
                  title={selected.familyName}
                  subtitle={`${selected.orderNumber} · ${minuteLabel(selected.windowStartMinute)}–${minuteLabel(selected.windowEndMinute)}`}
                  fallback={selected.familyName}
                  src={selected.familyImage}
                  size="sm"
                  meta={<NBadge status={selected.category}>{t(categoryKey(selected.category))}</NBadge>}
                />
              </div>
            ) : null}
          </DashboardAttentionCard>

          <DashboardQuickActionsCard actions={quickActions} title={t("dashboard.delivery.quickActions")} />
        </div>

        <NCard
          className="h-full xl:col-span-6"
          classNames={{
            content: "flex h-full min-h-0 flex-col",
            header: "flex-wrap gap-2",
          }}
          title={t("dashboard.delivery.mapTitle")}
          description={t("dashboard.delivery.mapSubtitle")}
          icon={MapPin}
        >
          <NCardAction>
            <div className="flex items-center gap-2">
              <NButton
                aria-pressed={date === today}
                className="h-10 px-3"
                onClick={() => changeDate(today)}
                size="lg"
                type="button"
                variant={date === today ? "secondary" : "outline"}
              >
                {t("dashboard.delivery.today")}
              </NButton>
              <DateInput
                ariaLabel={t("dashboard.delivery.selectDate")}
                className="w-32 sm:w-48"
                onChange={changeDate}
                value={new Date(`${date}T12:00:00`)}
              />
            </div>
          </NCardAction>

          <div className="relative min-h-[34rem] flex-1 overflow-hidden rounded-xl border">
            <DeliveryMap
              items={items}
              selectedId={effectiveSelectedId}
              onSelect={onSelect}
              ariaLabel={t("dashboard.delivery.mapTitle")}
              emptyTitle={t("dashboard.delivery.noMapLocations")}
              emptyDescription={t("dashboard.delivery.noMapLocationsHint")}
              errorTitle={t("operator.families.locationProviderError")}
            />

            {selected ? (
              <div className="absolute inset-x-3 bottom-3 z-[500] rounded-xl border bg-card/95 p-4 shadow-xl backdrop-blur md:left-1/2 md:right-auto md:w-[22rem] md:-translate-x-1/2">
                <div className="flex items-start justify-between gap-3">
                  <NAvatar title={selected.familyName} subtitle={selected.orderNumber} fallback={selected.familyName} src={selected.familyImage} size="sm" />
                  <NBadge status={selected.category}>{t(categoryKey(selected.category))}</NBadge>
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <span><MapPin className="me-2 inline size-4" />{selected.address}</span>
                  <span><CalendarDays className="me-2 inline size-4" />{selected.scheduledDate} · {minuteLabel(selected.windowStartMinute)}–{minuteLabel(selected.windowEndMinute)}</span>
                  <span><Package className="me-2 inline size-4" />{fmt.number(selected.packageCount)} {t("dashboard.delivery.packages")}</span>
                </div>
                {!selected.coordinates ? <p className="mt-2 text-sm font-medium text-amber-600">{t("dashboard.delivery.locationUnavailable")}</p> : null}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <NButton size="sm" variant="outline" disabled={!selected.phone} onClick={() => { if (selected.phone) window.location.href = `tel:${selected.phone}`; }}>
                    <Phone className="size-4" />{t("dashboard.delivery.callFamily")}
                  </NButton>
                  <NButton
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const query = selected.coordinates ? `${selected.coordinates.latitude},${selected.coordinates.longitude}` : selected.address;
                      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <ExternalLink className="size-4" />{t("dashboard.delivery.openMaps")}
                  </NButton>
                  {selected.canStart ? (
                    <NButton size="sm" className="col-span-2" disabled={commands.start.isPending} onClick={() => void start(selected)}>
                      <Play className="size-4" />{t("dashboard.delivery.startDelivery")}
                    </NButton>
                  ) : null}
                  {selected.canConfirm ? (
                    <NButton size="sm" className="col-span-2" disabled={commands.confirm.isPending} onClick={() => void confirm(selected)}>
                      <CheckCircle2 className="size-4" />{t("dashboard.delivery.confirmDelivery")}
                    </NButton>
                  ) : null}
                </div>
                {selected.canReportIssue ? (
                  <div className="mt-3 flex gap-2">
                    <NativeSelect
                      className="min-w-0 flex-1"
                      value={issueKind}
                      aria-label={t("dashboard.delivery.issueKind")}
                      options={[
                        { value: "address_confirmation", label: t("dashboard.delivery.addressToConfirm") },
                        { value: "family_unreachable", label: t("dashboard.delivery.familyUnreachable") },
                        { value: "missing_proof", label: t("dashboard.delivery.missingProof") },
                      ]}
                      onChange={(event) => setIssueKind(event.target.value as typeof issueKind)}
                    />
                    <NButton size="sm" variant="outline" disabled={commands.reportIssue.isPending} onClick={() => void reportIssue(selected)}>
                      <AlertTriangle className="size-4" />
                      <span className="sr-only">{t("dashboard.delivery.reportIssue")}</span>
                    </NButton>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {chartItems.map((item) => <NBadge key={item.id} status={item.id}>{item.label} ({fmt.number(item.value)})</NBadge>)}
          </div>
        </NCard>
      </div>
    </NPageLayout>
  );
}
