"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { NButton, NCard, NPageLayout } from "najm-kit";

import { formatKafilDate, formatMad, formatStatusLabel } from "@/lib/format";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { createOffsetPagination, getPageIndex, hasPossibleNextPage } from "@/lib/pagination";
import { PageEmptyState } from "@/shared/PageState";
import { StatusBadge } from "@/shared/StatusBadge";

import { useFamilyOrder, useFamilyOrderingCommands, useFamilyOrders } from "../hooks/useFamilyOrdering";

export function FamilyOrdersPage() {
  const [pagination, setPagination] = useState(() => createOffsetPagination(0, 12));
  const [selectedId, setSelectedId] = useState("");
  const orders = useFamilyOrders(pagination);
  const detail = useFamilyOrder(selectedId);
  const commands = useFamilyOrderingCommands();
  const rows = orders.data ?? [];
  const pageIndex = getPageIndex(pagination);

  return <NPageLayout className="flex h-full min-h-0 flex-col gap-4"><NPageHeader icon={ClipboardList} title="Your orders" subtitle="Track the status and recorded timeline of orders placed by your household." actions={<PageHeaderGlobalActions />} />
    {orders.isPending ? <NCard title="Loading your orders" loading /> : orders.isError ? <NCard title="We could not load your orders"><NButton variant="outline" onClick={() => void orders.refetch()}>Try again</NButton></NCard> : rows.length ? <><div className="grid gap-3 lg:grid-cols-2">{rows.map((order) => <NCard key={order.id}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-muted-foreground">Placed {formatKafilDate(order.createdAt)}</p></div><StatusBadge status={order.status} /></div><div className="mt-4 flex items-center justify-between"><p className="font-semibold">{formatMad(order.totalMinor)}</p><div className="flex gap-2"><NButton size="sm" variant="outline" onClick={() => setSelectedId(order.id)}>Track</NButton>{order.status === "pending" ? <NButton size="sm" variant="outline" disabled={commands.cancel.isPending} onClick={() => void commands.cancel.mutateAsync({ id: order.id })}>Cancel</NButton> : null}</div></div></NCard>)}</div>
    <div className="flex justify-between"><NButton variant="outline" disabled={pageIndex === 0} onClick={() => setPagination(createOffsetPagination(pageIndex - 1, pagination.limit))}>Previous</NButton><NButton variant="outline" disabled={!hasPossibleNextPage(rows.length, pagination)} onClick={() => setPagination(createOffsetPagination(pageIndex + 1, pagination.limit))}>Next</NButton></div>
    {selectedId ? <NCard title="Order timeline" description={detail.data?.orderNumber || "Loading order details"} loading={detail.isPending}>{detail.data?.statusEvents.map((event) => <div className="border-t border-border py-3" key={event.id}><p className="font-medium">{formatStatusLabel(event.toStatus)}</p><p className="text-sm text-muted-foreground">{formatKafilDate(event.createdAt)}{event.reason ? ` - ${event.reason}` : ""}</p></div>)}</NCard> : null}</> : <PageEmptyState title="No orders yet" description="Submit your prepared cart when your household is ready." />}</NPageLayout>;
}
