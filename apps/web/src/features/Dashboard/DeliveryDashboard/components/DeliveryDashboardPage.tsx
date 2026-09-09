"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
  AlertTriangle, CalendarDays, CheckCircle2, Clock3, ExternalLink, MapPin,
  Package, PackageCheck, Phone, Play, Truck, UsersRound,
} from "lucide-react";
import {
  DateInput, NAvatar, NBadge, NButton, NCard, NEmptyState, NErrorState,
  NGrid, NGridItem, NPageHeader, NPageHeaderActions, NPageLayout, NPieChart,
  NStatCard, useNajmFormat,
} from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { getPublicApiErrorMessage } from "@/services/apiError";
import type { DeliveryDashboardItem } from "../../types";
import { useDeliveryDashboard, useDeliveryDashboardCommands } from "../hooks/useDeliveryDashboard";

const DeliveryMap = dynamic(() => import("./DeliveryMap").then((module) => module.DeliveryMap), {
  ssr: false,
  loading: () => <div className="h-[32rem] animate-pulse rounded-xl bg-muted" />,
});

function casablancaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function tomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(tomorrow);
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
  const router = useRouter();
  const search = useSearchParams();
  const requestedDate = search.get("date");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate ?? "") ? requestedDate! : casablancaDate();
  const dashboard = useDeliveryDashboard(date);
  const commands = useDeliveryDashboardCommands(date);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [issueKind, setIssueKind] = useState<"address_confirmation" | "family_unreachable" | "missing_proof">("address_confirmation");

  const items = dashboard.data?.deliveries ?? [];
  const selected = items.find((item) => item.attemptId === selectedId) ?? items[0] ?? null;
  const effectiveSelectedId = selected?.attemptId ?? null;
  const onSelect = useCallback((id: string) => setSelectedId(id), []);

  function changeDate(next: string | undefined) {
    if (!next) return;
    setSelectedId(null);
    setShowAll(false);
    const params = new URLSearchParams(search.toString());
    params.set("date", next);
    router.replace(`/delivery?${params.toString()}`, { scroll: false });
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
      id: item.orderId, attemptId: item.attemptId, kind: issueKind,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  if (dashboard.isError) return <NErrorState title={t("dashboard.delivery.error")} message={getPublicApiErrorMessage(dashboard.error, t("state.retry"))} onRetry={() => void dashboard.refetch()} surface="panel" />;
  if (dashboard.isPending || !dashboard.data) return <div className="m-4 h-96 animate-pulse rounded-xl bg-muted" />;
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
    { key: "addressToConfirm" as const, value: data.issueCounts.addressToConfirm },
    { key: "familyUnreachable" as const, value: data.issueCounts.familyUnreachable },
    { key: "missingProof" as const, value: data.issueCounts.missingProof },
    { key: "delayed" as const, value: data.issueCounts.delayed },
  ];

  return (
    <NPageLayout className="flex min-h-full flex-col gap-4">
      <NPageHeader icon={Truck} title={t("dashboard.delivery.title")} subtitle={t("dashboard.delivery.subtitle")}>
        <NPageHeaderActions><PageHeaderGlobalActions /></NPageHeaderActions>
      </NPageHeader>
      <NGrid cols={2} lgCols={3} xlCols={6}>
        {statCards.map(({ icon: Icon, key, value }) => <NGridItem key={key} span={1}><NStatCard icon={Icon} label={t(`dashboard.delivery.${key}`)} value={fmt.number(value)} /></NGridItem>)}
      </NGrid>

      <div className="grid flex-1 gap-4 xl:grid-cols-12">
        <div className="grid content-start gap-4 md:grid-cols-2 xl:col-span-6">
          <NPieChart title={t("dashboard.delivery.overview")} icon={PackageCheck} items={chartItems} valueFormatter={fmt.number} />
          <div id="delivery-list">
          <NCard title={t("dashboard.delivery.todaysDeliveries")} icon={Truck} empty={items.length === 0} emptyText={t("dashboard.delivery.noDeliveries")}>
            <div className="space-y-2">
              {(showAll ? items : items.slice(0, 5)).map((item) => (
                <NButton key={item.attemptId} variant={item.attemptId === effectiveSelectedId ? "secondary" : "ghost"} className="h-auto w-full justify-between px-2 py-2" onClick={() => onSelect(item.attemptId)}>
                  <NAvatar title={item.familyName} fallback={item.familyName} src={item.familyImage} size="sm" />
                  <span className="ms-auto text-xs text-muted-foreground">{minuteLabel(item.windowStartMinute)}–{minuteLabel(item.windowEndMinute)}</span>
                  <NBadge status={item.category}>{t(categoryKey(item.category))}</NBadge>
                </NButton>
              ))}
              {items.length > 5 ? <NButton variant="outline" className="w-full" onClick={() => setShowAll((current) => !current)}>{showAll ? t("dashboard.delivery.showLess") : t("dashboard.delivery.viewAll")}</NButton> : null}
            </div>
          </NCard>
          </div>
          <NCard title={t("dashboard.delivery.attentionTitle")} icon={AlertTriangle}>
            <div className="space-y-2 text-sm">
              {attentionRows.map(({ key, value }) => (
                <div key={key} className="flex justify-between"><span>{t(`dashboard.delivery.${key}`)}</span><strong>{fmt.number(value)}</strong></div>
              ))}
            </div>
          </NCard>
          <NCard title={t("dashboard.delivery.quickActions")} icon={Play}>
            <div className="grid gap-2">
              <NButton variant="outline" onClick={() => document.getElementById("delivery-list")?.scrollIntoView({ behavior: "smooth" })}>{t("dashboard.delivery.viewDeliveries")}</NButton>
              <NButton variant="outline" disabled={!selected?.phone} onClick={() => { if (selected?.phone) window.location.href = `tel:${selected.phone}`; }}><Phone className="size-4" />{t("dashboard.delivery.callFamily")}</NButton>
              <NButton variant="outline" disabled={!selected} onClick={() => { if (selected) void reportIssue(selected); }}><AlertTriangle className="size-4" />{t("dashboard.delivery.reportIssue")}</NButton>
            </div>
          </NCard>
        </div>

        <NCard className="xl:col-span-6" title={t("dashboard.delivery.mapTitle")} description={t("dashboard.delivery.mapSubtitle")} icon={MapPin}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <DateInput value={new Date(`${date}T12:00:00`)} onChange={changeDate} ariaLabel={t("dashboard.delivery.selectDate")} />
            <NButton variant="outline" onClick={() => changeDate(casablancaDate())}>{t("dashboard.delivery.today")}</NButton>
            <NButton variant="outline" onClick={() => changeDate(tomorrowDate())}>{t("dashboard.delivery.tomorrow")}</NButton>
          </div>
          {items.some((item) => item.coordinates) ? <DeliveryMap items={items} selectedId={effectiveSelectedId} onSelect={onSelect} /> : <NEmptyState title={t("dashboard.delivery.noMapLocations")} description={t("dashboard.delivery.noMapLocationsHint")} surface="panel" />}
          <div className="mt-3 flex flex-wrap gap-2">{chartItems.map((item) => <NBadge key={item.id} status={item.id}>{item.label} ({item.value})</NBadge>)}</div>
          {selected ? (
            <div className="mt-4 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><NAvatar title={selected.familyName} subtitle={selected.orderNumber} fallback={selected.familyName} src={selected.familyImage} /><NBadge status={selected.category}>{t(categoryKey(selected.category))}</NBadge></div>
              <div className="mt-3 grid gap-2 text-sm"><span><MapPin className="me-2 inline size-4" />{selected.address}</span><span><CalendarDays className="me-2 inline size-4" />{selected.scheduledDate} · {minuteLabel(selected.windowStartMinute)}–{minuteLabel(selected.windowEndMinute)}</span><span><Package className="me-2 inline size-4" />{fmt.number(selected.packageCount)} {t("dashboard.delivery.packages")}</span></div>
              {!selected.coordinates ? <p className="mt-2 text-sm font-medium text-amber-600">{t("dashboard.delivery.locationUnavailable")}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <NButton variant="outline" disabled={!selected.phone} onClick={() => { if (selected.phone) window.location.href = `tel:${selected.phone}`; }}><Phone className="size-4" />{t("dashboard.delivery.callFamily")}</NButton>
                <NButton variant="outline" onClick={() => { const query = selected.coordinates ? `${selected.coordinates.latitude},${selected.coordinates.longitude}` : selected.address; window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer"); }}><ExternalLink className="size-4" />{t("dashboard.delivery.openMaps")}</NButton>
                {selected.canStart ? <NButton disabled={commands.start.isPending} onClick={() => void start(selected)}><Play className="size-4" />{t("dashboard.delivery.startDelivery")}</NButton> : null}
                {selected.canConfirm ? <NButton disabled={commands.confirm.isPending} onClick={() => void confirm(selected)}><CheckCircle2 className="size-4" />{t("dashboard.delivery.confirmDelivery")}</NButton> : null}
              </div>
              {selected.canReportIssue ? <div className="mt-3 flex flex-wrap gap-2"><select className="min-h-9 rounded-md border bg-background px-3 text-sm" value={issueKind} aria-label={t("dashboard.delivery.issueKind")} onChange={(event) => setIssueKind(event.target.value as typeof issueKind)}><option value="address_confirmation">{t("dashboard.delivery.addressToConfirm")}</option><option value="family_unreachable">{t("dashboard.delivery.familyUnreachable")}</option><option value="missing_proof">{t("dashboard.delivery.missingProof")}</option></select><NButton variant="outline" disabled={commands.reportIssue.isPending} onClick={() => void reportIssue(selected)}><AlertTriangle className="size-4" />{t("dashboard.delivery.reportIssue")}</NButton></div> : null}
            </div>
          ) : null}
        </NCard>
      </div>
    </NPageLayout>
  );
}
