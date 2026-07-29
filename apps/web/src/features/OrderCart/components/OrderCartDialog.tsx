"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Package, Plus, ShoppingCart, Trash2, Wallet } from "lucide-react";
import {
  NButton,
  NCard,
  NEmptyState,
  NSheet,
  SimpleTooltip,
} from "najm-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { useKafilRole } from "@/shared/Authorization";
import { formatMad } from "@/lib/format";
import { productKeys } from "@/features/Products/hooks/productKeys";
import { getProduct } from "@/services/productApi";
import { getFamilyCatalogProduct } from "@/services/familyCatalogApi";
import { useOwnFamilyBudgetSummary } from "@/features/FamilyBudget/hooks/useFamilyBudget";
import { ProtectedImage } from "@/shared/ProtectedImage";

import { useOrderCart } from "../hooks/useOrderCart";
import { useOrderCartStore } from "../store/orderCartStore";
import type { OrderCartDraftItem } from "../types";
import { ORDER_CART_MAX_QUANTITY } from "../types";
import { AssistedFamilySelector } from "./AssistedFamilySelector";

function OrderCartLine({
  item,
  onDecrease,
  onIncrease,
  onRemove,
  removeLabel,
  decreaseLabel,
  increaseLabel,
  quantityLabel,
  unavailableLabel,
  familyMode,
}: Readonly<{
  item: OrderCartDraftItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
  removeLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  quantityLabel: string;
  unavailableLabel: string;
  familyMode: boolean;
}>) {
  const productImage = useQuery<string | null>({
    queryKey: familyMode
      ? ["family-catalog", "product", item.productId]
      : productKeys.detail(item.productId),
    queryFn: async () => {
      const product = familyMode
        ? await getFamilyCatalogProduct(item.productId)
        : await getProduct(item.productId);
      return product.imageUrl;
    },
    enabled: !item.imageUrl,
    staleTime: 5 * 60 * 1_000,
  });
  const imageUrl = item.imageUrl ?? productImage.data ?? null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card/40 p-2.5">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {imageUrl ? (
          <ProtectedImage
            alt={item.productName}
            className="size-full object-contain"
            fill
            sizes="56px"
            src={imageUrl}
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Package aria-hidden className="size-6" />
          </div>
        )}
      </div>
      <div className="min-w-28 flex-1">
        <p className="truncate text-sm font-semibold">{item.productName}</p>
        <p className="text-xs text-muted-foreground">
          {formatMad(item.estimatedUnitPriceMinor)} × {item.quantity}
        </p>
        {!item.available ? (
          <p className="mt-1 text-xs text-destructive">{unavailableLabel}</p>
        ) : null}
      </div>
      <div className="ms-auto inline-flex items-center overflow-hidden rounded-lg border border-input">
        <NButton
          aria-label={decreaseLabel}
          className="size-8"
          disabled={item.quantity <= 1}
          onClick={onDecrease}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Minus aria-hidden className="size-4" />
        </NButton>
        <span
          aria-label={quantityLabel}
          aria-live="polite"
          className="flex size-8 items-center justify-center border-x border-input text-xs font-semibold tabular-nums"
        >
          {item.quantity}
        </span>
        <NButton
          aria-label={increaseLabel}
          className="size-8"
          disabled={item.quantity >= ORDER_CART_MAX_QUANTITY}
          onClick={onIncrease}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Plus aria-hidden className="size-4" />
        </NButton>
      </div>
      <NButton
        aria-label={removeLabel}
        className="size-8 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 aria-hidden className="size-4" />
      </NButton>
    </div>
  );
}

export function OrderCartSheet({
  open,
  onOpenChange,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { t } = useKafilLanguage();
  const { isExactFamily } = useKafilRole();
  const queryClient = useQueryClient();
  const orderCart = useOrderCart();
  const setAvailability = useOrderCartStore((state) => state.setAvailability);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);
  const [selectedFamily, setSelectedFamily] = useState<string>("");
  const [selectedFamilyFundingEligible, setSelectedFamilyFundingEligible] =
    useState(false);

  const familyBudget = useOwnFamilyBudgetSummary({
    enabled: open && isExactFamily,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const assistedItemIds = orderCart.items
    .map((item) => item.productId)
    .sort()
    .join("|");

  useEffect(() => {
    if (!open || isExactFamily) return;
    let cancelled = false;
    const productIds = assistedItemIds ? assistedItemIds.split("|") : [];
    void Promise.all(
      productIds.map(async (productId) => {
        try {
          const product = await queryClient.fetchQuery({
            queryKey: productKeys.detail(productId),
            queryFn: () => getProduct(productId),
            staleTime: 0,
          });
          return [productId, product.status === "active"] as const;
        } catch {
          return [productId, false] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      for (const [productId, available] of results) {
        setAvailability(productId, available);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    assistedItemIds,
    open,
    isExactFamily,
    queryClient,
    setAvailability,
  ]);

  const unitsLabel = t("family.orderCart.quantityCount", {
    count: orderCart.totalQuantity,
  });
  const totalsLabel = t("family.orderCart.estimatedTotal");
  const saveLabel = isExactFamily
    ? t("family.orderCart.save")
    : t("family.orderCart.saveAssisted");
  const savePendingLabel = t("family.orderCart.saving");
  const resetLabel = t("family.orderCart.reset");
  const fundingTargetRequiredLabel = t(
    "family.orderCart.fundingTargetRequired",
  );
  const saving = orderCart.saving || busy;
  const showAssistedFields = !isExactFamily;
  const cartEmptyHint = t("family.orderCart.emptyHint");
  const familyUnavailableLabel = t("family.orderCart.unavailable");
  const itemQuantityAria = (name: string) =>
    t("family.orderCart.quantityAria", { name });
  const itemDecreaseAria = (name: string) =>
    t("family.orderCart.decrease", { name });
  const itemIncreaseAria = (name: string) =>
    t("family.orderCart.increase", { name });
  const itemRemoveAria = (name: string) =>
    t("family.orderCart.remove", { name });

  async function handleSave() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    try {
      const result = isExactFamily
        ? await orderCart.save({ mode: "family" })
        : await orderCart.save({
            mode: "assisted",
            familyProfileId: selectedFamily,
            assistanceChannel: "phone",
          });
      if (result) {
        if (!isExactFamily) {
          setSelectedFamily("");
          setSelectedFamilyFundingEligible(false);
        }
        onOpenChange(false);
      }
    } catch {
      // useEntityCommand already presents the error toast.
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  }

  function handleReset() {
    orderCart.reset();
    setSelectedFamily("");
    setSelectedFamilyFundingEligible(false);
  }

  const unavailableItemCount = orderCart.items.filter(
    (item) => !item.available,
  ).length;
  const hasAnyItems = orderCart.distinctItemCount > 0;
  const allItemsAvailable = hasAnyItems && unavailableItemCount === 0;
  const fundingTargetReached = isExactFamily
    ? !familyBudget.isFetching &&
      familyBudget.data?.funding.status === "active"
    : selectedFamilyFundingEligible;
  const canSaveAssisted = showAssistedFields
    ? Boolean(selectedFamily) &&
      fundingTargetReached &&
      hasAnyItems &&
      allItemsAvailable
    : fundingTargetReached && allItemsAvailable;
  const fundingTargetBlocksOrder =
    hasAnyItems &&
    allItemsAvailable &&
    !saving &&
    (isExactFamily
      ? !familyBudget.isFetching &&
        Boolean(familyBudget.data) &&
        !fundingTargetReached
      : Boolean(selectedFamily) && !fundingTargetReached);

  return (
    <NSheet
      classNames={{ body: "p-4", content: "bg-background" }}
      footer={
        hasAnyItems ? (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{unitsLabel}</span>
              <span className="font-semibold text-foreground">
                {totalsLabel}: {formatMad(orderCart.estimatedTotalMinor)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <NButton type="button" variant="outline" onClick={handleReset}>
                {resetLabel}
              </NButton>
              <SimpleTooltip
                content={fundingTargetRequiredLabel}
                disabled={!fundingTargetBlocksOrder}
                side="top"
              >
                <span
                  className="flex flex-1"
                  tabIndex={fundingTargetBlocksOrder ? 0 : undefined}
                >
                  <NButton
                    className="w-full"
                    disabled={!canSaveAssisted || saving}
                    type="button"
                    onClick={handleSave}
                  >
                    {saving ? savePendingLabel : saveLabel}
                  </NButton>
                </span>
              </SimpleTooltip>
            </div>
          </div>
        ) : undefined
      }
      icon={ShoppingCart}
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title={t("nav.cart")}
      width={440}
    >
      {!hasAnyItems ? (
        <NEmptyState
          className="py-8"
          description={cartEmptyHint}
          icon={ShoppingCart}
        />
      ) : (
        <div className="space-y-3">
          {showAssistedFields ? (
            <AssistedFamilySelector
              value={selectedFamily}
              onChange={setSelectedFamily}
              onFundingEligibilityChange={setSelectedFamilyFundingEligible}
              disabled={saving}
            />
          ) : null}

          {isExactFamily && familyBudget.data ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <NCard
                embedded
                icon={Wallet}
                title={t("operator.budgets.available")}
                description={formatMad(familyBudget.data.availableMinor)}
              />
              <NCard
                embedded
                icon={Wallet}
                title={t("operator.budgets.reserved")}
                description={formatMad(familyBudget.data.reservedMinor)}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            {orderCart.items.map((item) => (
              <OrderCartLine
                key={item.productId}
                decreaseLabel={itemDecreaseAria(item.productName)}
                increaseLabel={itemIncreaseAria(item.productName)}
                item={item}
                familyMode={isExactFamily}
                quantityLabel={itemQuantityAria(item.productName)}
                removeLabel={itemRemoveAria(item.productName)}
                unavailableLabel={familyUnavailableLabel}
                onDecrease={() =>
                  orderCart.setQuantity(
                    item.productId,
                    Math.max(1, item.quantity - 1),
                  )
                }
                onIncrease={() =>
                  orderCart.setQuantity(item.productId, item.quantity + 1)
                }
                onRemove={() => orderCart.remove(item.productId)}
              />
            ))}
            {unavailableItemCount > 0 ? (
              <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                {familyUnavailableLabel}
              </p>
            ) : null}
          </div>

        </div>
      )}
    </NSheet>
  );
}
