"use client";
import { PackageCheck } from "lucide-react";
import { NButton, NCard, NPageLayout } from "najm-kit";
import { formatKafilDate, formatMad } from "@/lib/format";
import { PageEmptyState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";
import { useSponsorOrders } from "../hooks/useSponsorWorkspace";
export function SponsorOrdersPage() { const orders = useSponsorOrders({ limit: 50, offset: 0 }); return <NPageLayout className="flex h-full min-h-0 flex-col gap-4"><NPageHeader icon={PackageCheck} title="Supported orders" subtitle="Privacy-safe order summaries for households with active support." actions={<PageHeaderGlobalActions />} />{orders.isPending ? <NCard title="Loading supported orders" loading /> : orders.isError ? <NCard title="We could not load supported orders"><NButton variant="outline" onClick={() => void orders.refetch()}>Try again</NButton></NCard> : orders.data?.length ? <div className="space-y-3">{orders.data.map((order) => <NCard key={order.id}><div className="flex justify-between gap-3"><div><p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-muted-foreground">Placed {formatKafilDate(order.placedAt)} - {order.items.reduce((total, item) => total + item.quantity, 0)} items</p></div><StatusBadge status={order.status} /></div><p className="mt-3 font-semibold">{formatMad(order.totalMinor)}</p></NCard>)}</div> : <PageEmptyState title="No supported orders yet" description="Privacy-safe order activity appears after a supported household submits an order." />}</NPageLayout>; }
