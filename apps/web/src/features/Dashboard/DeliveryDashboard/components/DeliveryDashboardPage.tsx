"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClockAlert,
  Clock3,
  FileWarning,
  MapPin,
  MapPinned,
  Package,
  PackageCheck,
  Phone,
  PhoneOff,
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
  NEmptyState,
  NErrorState,
  NGrid,
  NGridItem,
  NPageHeader,
  NPageHeaderActions,
  NPageLayout,
  NPieChart,
  NSpinner,
  NStatCard,
  useNajmFormat,
} from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { getPublicApiErrorMessage } from "@/services/apiError";
import { DashboardAttentionCard } from "../../shared/DashboardAttentionCard";
import { DashboardQuickActionsCard } from "../../shared/DashboardQuickActionsCard";
import { DeliveryDashboardSkeleton } from "../../shared/DashboardSkeletons";
import { casablancaToday } from "../../shared/deliveryTime";
import type { DeliveryDashboardItem } from "../../types";
import { useDeliveryDashboard, useDeliveryDashboardCommands } from "../hooks/useDeliveryDashboard";
import type { MarkerFocusHandle } from "./DeliveryMap";
import { DeliveryOrderSheet, workflowLabelKey } from "./DeliveryOrderSheet";

const DeliveryMap = dynamic(() => import("./DeliveryMap").then((module) => module.DeliveryMap), {
  ssr: false,
  loading: () => <div className="h-[34rem] animate-pulse rounded-xl bg-muted" />,
});

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
  const [date, setDate] = useState(() => casablancaToday());
  const today = casablancaToday();
  const dashboard = useDeliveryDashboard(date);
  const commands = useDeliveryDashboardCommands(date);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  // Focus returns to whichever control opened the sheet. A marker is not kept
  // as an element: the map rebuilds its markers whenever the deliveries
  // refetch, so the attempt id is resolved to a live element on close.
  const triggerRef = useRef<HTMLElement | null>(null);
  const markerTriggerRef = useRef<string | null>(null);
  const mapHandleRef = useRef<MarkerFocusHandle | null>(null);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has("date")) return;

    currentUrl.searchParams.delete("date");
    window.history.replaceState(window.history.state, "", currentUrl);
  }, []);

  const isDateTransition = dashboard.isPlaceholderData && dashboard.isFetching;
  const items = dashboard.data?.deliveries ?? [];
  const selected = isDateTransition
    ? null
    : items.find((item) => item.attemptId === selectedId) ?? null;
  const effectiveSelectedId = selected?.attemptId ?? null;

  // A marker and a planned-delivery row open exactly the same selection.
  const openAttempt = useCallback((attemptId: string, trigger?: HTMLElement | null) => {
    triggerRef.current = trigger ?? null;
    markerTriggerRef.current = null;
    setSelectedId(attemptId);
  }, []);
  const selectFromMap = useCallback((attemptId: string) => {
    triggerRef.current = null;
    markerTriggerRef.current = attemptId;
    setSelectedId(attemptId);
  }, []);
  const markerLabel = useCallback(
    (item: DeliveryDashboardItem) =>
      `${t("dashboard.delivery.markerLabel", {
        family: item.familyName,
        order: item.orderNumber,
        workflow: t(workflowLabelKey(item.workflowState)),
      })}${item.delayed || item.openIssues.length ? ` · ${t(categoryKey(item.category))}` : ""}`,
    [t],
  );

  function closeSheet(open: boolean) {
    if (open) return;
    setSelectedId(null);
    const trigger = triggerRef.current;
    const marker = markerTriggerRef.current;
    triggerRef.current = null;
    markerTriggerRef.current = null;
    if (marker) mapHandleRef.current?.focusMarker(marker);
    else trigger?.focus();
  }

  function changeDate(next: string | undefined) {
    if (!next || next === date) return;
    setSelectedId(null);
    setShowAll(false);
    setDate(next);
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
      onClick: () => {
        if (!selected?.canConfirm) return;
        void commands.confirm.mutateAsync({
          id: selected.orderId,
          confirmationMethod: "operator_confirmation",
          idempotencyKey: crypto.randomUUID(),
        });
      },
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
      disabled: !selected,
      icon: AlertTriangle,
      id: "report-issue",
      label: t("dashboard.delivery.reportIssue"),
      onClick: () => { if (selected) openAttempt(selected.attemptId, null); },
    },
  ];

  return (
    <NPageLayout className="flex min-h-full flex-col gap-4 xl:h-full xl:min-h-0">
      <NPageHeader card icon={Truck} title={t("dashboard.delivery.title")} subtitle={t("dashboard.delivery.subtitle")}>
        <NPageHeaderActions><PageHeaderGlobalActions /></NPageHeaderActions>
      </NPageHeader>

      <NGrid className="shrink-0" cols={2} lgCols={3} xlCols={6}>
        {statCards.map(({ icon: Icon, key, value }) => (
          <NGridItem key={key} span={1}>
            <NStatCard variant="compact" icon={Icon} label={t(`dashboard.delivery.${key}`)} value={fmt.number(value)} className="sm:hidden" />
            <NStatCard icon={Icon} label={t(`dashboard.delivery.${key}`)} value={fmt.number(value)} className="hidden sm:block" />
          </NGridItem>
        ))}
      </NGrid>

      {/* One workspace: the map owns the full-height left half at xl. The
          delivery plan and supporting panels share the right half; below xl
          everything stays in reading order. */}
      <NGrid className="xl:min-h-0 xl:flex-1" cols={1} xlCols={2}>
        <NGridItem className="min-w-0 xl:min-h-0" span={1} xlSpan={1}>
          <NCard
            className="h-full xl:min-h-0"
            classNames={{
              // No `flex-wrap`: the installed header is one row whose title side is
              // already `min-w-0`, so Today and the date field stay beside the
              // title at every width instead of dropping to a second row.
              content: "flex min-h-0 flex-col xl:flex-1",
              description: "truncate",
              header: "gap-2",
            }}
            title={t("dashboard.delivery.mapTitle")}
            description={t("dashboard.delivery.mapSubtitle")}
            icon={MapPin}
          >
            <NCardAction>
              <div aria-busy={isDateTransition} className="flex items-center gap-2">
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
                {/* The transition indicator takes over the date field's own icon
                    slot rather than standing beside it, so the header keeps the
                    same width and height while the next date loads. */}
                <div className="relative w-32 sm:w-48">
                  <DateInput
                    ariaLabel={t("dashboard.delivery.selectDate")}
                    className="w-full"
                    onChange={changeDate}
                    showIcon={!isDateTransition}
                    value={new Date(`${date}T12:00:00`)}
                  />
                  {isDateTransition ? (
                    <span
                      className="pointer-events-none absolute inset-y-0 end-2 flex items-center"
                      role="status"
                    >
                      <NSpinner aria-hidden="true" size={16} />
                      <span className="sr-only">{t("state.loading")}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </NCardAction>

            {/* Nothing is layered over the markers: selection opens the sheet. */}
            <div className="relative min-h-[26rem] flex-1 overflow-hidden rounded-xl border sm:min-h-[34rem] xl:min-h-0">
              <DeliveryMap
                handleRef={mapHandleRef}
                items={items}
                selectedId={effectiveSelectedId}
                onSelect={selectFromMap}
                ariaLabel={t("dashboard.delivery.mapTitle")}
                errorTitle={t("operator.families.locationProviderError")}
                markerLabel={markerLabel}
              />
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {chartItems.map((item) => <NBadge key={item.id} status={item.id}>{item.label} ({fmt.number(item.value)})</NBadge>)}
            </div>
          </NCard>
        </NGridItem>
        <NGridItem className="min-w-0 xl:min-h-0" span={1} xlSpan={1}>
          <div data-testid="delivery-workspace-side" className="flex h-full min-h-0 flex-col gap-4">
          <div className="grid min-h-0 gap-4 md:grid-cols-2 xl:flex-1">
          <div id="delivery-list" className="min-h-72 xl:min-h-0">
            <NCard
              className="h-full xl:min-h-0"
              classNames={{ content: "xl:min-h-0 xl:flex-1" }}
              title={t("dashboard.delivery.todaysDeliveries")}
              icon={Truck}
            >
              {items.length === 0 ? (
                <NEmptyState
                  className="min-h-40 py-8"
                  icon={Truck}
                  title={t("dashboard.delivery.noDeliveries")}
                />
              ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-1">
                {/* Only the rows scroll at xl, where the card is bound to the
                    workspace height; Show all stays reachable. */}
                <div className="space-y-1 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
                  {(showAll ? items : items.slice(0, 5)).map((item) => (
                    <NButton
                      key={item.attemptId}
                      variant="outline"
                      className={`h-auto w-full justify-start gap-3 px-2 py-2 text-start ${item.attemptId === effectiveSelectedId ? "border-primary bg-secondary" : ""}`}
                      onClick={(event) => openAttempt(item.attemptId, event.currentTarget)}
                    >
                      <NAvatar fallback={item.familyName} src={item.familyImage} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{item.familyName}</span>
                        {item.phone ? (
                          <span dir="ltr" className="block truncate text-start text-xs font-normal text-muted-foreground">{item.phone}</span>
                        ) : null}
                        <span className="sr-only">{item.orderNumber}</span>
                      </span>
                      <span className="flex shrink-0 flex-wrap justify-end gap-1">
                        <NBadge status={item.workflowState}>{t(workflowLabelKey(item.workflowState))}</NBadge>
                        {item.delayed || item.openIssues.length ? (
                          <NBadge status={item.category}>{t(categoryKey(item.category))}</NBadge>
                        ) : null}
                      </span>
                    </NButton>
                  ))}
                </div>
                {items.length > 5 ? (
                  <NButton variant="outline" className="w-full shrink-0" onClick={() => setShowAll((current) => !current)}>
                    {showAll ? t("dashboard.delivery.showLess") : t("dashboard.delivery.viewAll")}
                  </NButton>
                ) : null}
              </div>
              )}
            </NCard>
          </div>

          <NPieChart
            className="h-full min-h-72 xl:min-h-0"
            title={t("dashboard.delivery.overview")}
            icon={PackageCheck}
            items={chartItems}
            emptyLabel={<NEmptyState icon={PackageCheck} title={t("dashboard.delivery.noDeliveries")} />}
            valueFormatter={fmt.number}
          />
          </div>

          <div className="grid min-h-0 gap-4 md:grid-cols-2 xl:flex-1">
            <DashboardAttentionCard
              allClearLabel={t("dashboard.operator.allClear")}
              icon={AlertTriangle}
              items={attentionRows.map(({ key, ...item }) => ({
                ...item,
                label: t(`dashboard.delivery.${key}`),
              }))}
              title={t("dashboard.delivery.attentionTitle")}
            />

            <DashboardQuickActionsCard actions={quickActions} title={t("dashboard.delivery.quickActions")} />
          </div>
          </div>
        </NGridItem>
      </NGrid>

      <DeliveryOrderSheet
        open={Boolean(selected)}
        orderId={selected?.orderId ?? null}
        orderNumber={selected?.orderNumber ?? null}
        date={date}
        commands={commands}
        onOpenChange={closeSheet}
      />
    </NPageLayout>
  );
}
