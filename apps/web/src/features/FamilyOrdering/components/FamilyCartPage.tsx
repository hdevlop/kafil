"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NButton, NCard, NPageLayout } from "najm-kit";

import { formatMad } from "@/lib/format";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { PageEmptyState } from "@/shared/PageState";
import { FundingProgressCard } from "@/shared/FundingProgressCard";
import { useOwnFamilyBudgetSummary } from "@/features/FamilyBudget/hooks/useFamilyBudget";

import { useFamilyCart, useFamilyOrderingCommands } from "../hooks/useFamilyOrdering";

export function FamilyCartPage() {
  const router = useRouter();
  const { t } = useKafilLanguage();
  const cart = useFamilyCart();
  const budget = useOwnFamilyBudgetSummary();
  const commands = useFamilyOrderingCommands();

  async function submit() {
    if (budget.data?.funding.status !== "active") return;
    await commands.submit.mutateAsync(crypto.randomUUID());
    router.push("/family/orders");
  }

  if (cart.isPending) return <NCard title={t("family.cart.loadingTitle")} description={t("family.cart.loadingDescription")} loading />;
  if (cart.isError) return <NCard title={t("family.cart.errorTitle")} description={t("family.cart.errorDescription")}><NButton variant="outline" onClick={() => void cart.refetch()}>{t("action.retry")}</NButton></NCard>;

  const data = cart.data;
  if (!data?.items.length) {
    return <PageEmptyState title={t("family.cart.emptyTitle")} description={t("family.cart.emptyDescription")} action={<NButton asChild><Link href="/family/catalog">{t("action.browseCatalog")}</Link></NButton>} />;
  }

  const fundingActive = budget.data?.funding.status === "active";

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader icon={ShoppingCart} title={t("family.cart.title")} subtitle={t("family.cart.subtitle")} actions={<PageHeaderGlobalActions />} />
      {budget.data?.funding ? (
        <FundingProgressCard progress={budget.data.funding} />
      ) : (
        <NCard title="Checking family funding eligibility" loading />
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          {data.items.map((item) => (
            <NCard key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="font-semibold">{item.productName}</p><p className="text-sm text-muted-foreground">{formatMad(item.unitPriceMinor)} {t("family.cart.each")}{item.available ? "" : ` - ${t("family.cart.unavailable")}`}</p></div>
              <div className="flex items-center gap-2">
                <NButton size="sm" variant="outline" disabled={item.quantity <= 1 || commands.setQuantity.isPending} onClick={() => void commands.setQuantity.mutateAsync({ productId: item.productId, quantity: item.quantity - 1 })}>-</NButton>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <NButton size="sm" variant="outline" disabled={commands.setQuantity.isPending} onClick={() => void commands.setQuantity.mutateAsync({ productId: item.productId, quantity: item.quantity + 1 })}>+</NButton>
                <NButton size="sm" variant="ghost" disabled={commands.remove.isPending} onClick={() => void commands.remove.mutateAsync(item.productId)} aria-label={t("family.cart.remove", { name: item.productName })}><Trash2 className="size-4" /></NButton>
              </div>
              <p className="font-semibold sm:w-24 sm:text-right">{formatMad(item.lineTotalMinor)}</p>
            </NCard>
          ))}
        </div>
        <NCard title={t("family.cart.reviewTitle")} description={t("family.cart.reviewDescription")}>
          <div className="space-y-3"><div className="flex justify-between"><span className="text-muted-foreground">{t("family.cart.items")}</span><span>{data.items.length}</span></div><div className="flex justify-between border-t border-border pt-3 text-lg font-semibold"><span>{t("family.cart.total")}</span><span>{formatMad(data.totalMinor)}</span></div>{!fundingActive ? <p className="text-sm text-amber-700">Ordering unlocks automatically after validated contributions reach the platform funding target.</p> : null}<NButton className="w-full" disabled={!fundingActive || commands.submit.isPending || data.items.some((item) => !item.available)} onClick={() => void submit()}>{commands.submit.isPending ? t("action.submitting") : t("action.submitOrder")}</NButton><NButton className="w-full" variant="outline" disabled={commands.clear.isPending} onClick={() => void commands.clear.mutateAsync()}>{t("action.clearCart")}</NButton></div>
        </NCard>
      </div>
    </NPageLayout>
  );
}
