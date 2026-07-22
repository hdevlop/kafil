"use client";
import { WalletCards } from "lucide-react";
import { NButton, NCard, NPageLayout } from "najm-kit";
import { formatMad } from "@/lib/format";
import { PageEmptyState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { FundingProgressCard } from "@/shared/FundingProgressCard";
import { useSponsorBudget } from "../hooks/useSponsorWorkspace";
export function SponsorBudgetPage() { const budget = useSponsorBudget(); return <NPageLayout className="flex h-full min-h-0 flex-col gap-4"><NPageHeader icon={WalletCards} title="Budget use" subtitle="Review privacy-safe totals for the households you support." actions={<PageHeaderGlobalActions />} />{budget.isPending ? <NCard title="Loading budget use" loading /> : budget.isError ? <NCard title="We could not load budget use"><NButton variant="outline" onClick={() => void budget.refetch()}>Try again</NButton></NCard> : <><NCard title="Validated contributions"><p className="text-2xl font-semibold">{formatMad(budget.data?.validatedMinor)}</p></NCard>{budget.data?.supportedBudgets.length ? <div className="grid gap-4 md:grid-cols-2">{budget.data.supportedBudgets.map((item) => <div className="space-y-3" key={item.supportReference}>{item.funding ? <FundingProgressCard progress={item.funding} title={item.supportReference} /> : null}<NCard title="Budget use"><div className="grid grid-cols-3 gap-3 text-sm"><span>Available<br /><strong>{formatMad(item.availableMinor)}</strong></span><span>Reserved<br /><strong>{formatMad(item.reservedMinor)}</strong></span><span>Spent<br /><strong>{formatMad(item.spentMinor)}</strong></span></div></NCard></div>)}</div> : <PageEmptyState title="No supported budget data yet" description="Validated support will appear here once it is applied to an active assignment." />}</>}</NPageLayout>; }
