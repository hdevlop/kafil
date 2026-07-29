"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  NBadge,
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
import { useOwnFamilyProfile } from "@/features/FamilyDashboard/hooks/useFamilyDashboard";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { ProtectedImage } from "@/shared/ProtectedImage";

import { useOrderCart } from "../hooks/useOrderCart";
import { useOrderCartStore } from "../store/orderCartStore";
import type { OrderCartDraftItem } from "../types";
import { ORDER_CART_MAX_QUANTITY } from "../types";
import {
  AssistedFamilySelector,
  type AssistedFamilySelection,
} from "./AssistedFamilySelector";

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
  editable = true,
}: Readonly<{
  item: OrderCartDraftItem;
  onDecrease?: () => void;
  onIncrease?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  decreaseLabel?: string;
  increaseLabel?: string;
  quantityLabel?: string;
  unavailableLabel: string;
  familyMode: boolean;
  editable?: boolean;
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
    <div
      className={
        editable
          ? "flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card/40 p-2.5"
          : "flex items-center gap-3 px-3 py-3"
      }
    >
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
      {editable ? (
        <>
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
        </>
      ) : (
        <div className="ms-auto space-y-1 text-end">
          <NBadge color="success" look="soft" size="sm">
            × {item.quantity}
          </NBadge>
          <p className="text-xs font-semibold text-foreground">
            {formatMad(item.estimatedUnitPriceMinor * item.quantity)}
          </p>
        </div>
      )}
    </div>
  );
}

interface OrderConfirmationFamily {
  name: string;
  image: string | null;
  exactAddress: string;
  phone: string | null;
  availableMinor: number | null;
}

function OrderConfirmationStep({
  family,
  items,
  familyMode,
}: Readonly<{
  family: OrderConfirmationFamily;
  items: OrderCartDraftItem[];
  familyMode: boolean;
}>) {
  const { t } = useKafilLanguage();

  return (
    <div className="space-y-5">
      <section className="flex items-center gap-3 border-b border-border pb-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
          <ProtectedImage
            alt={family.name}
            className="object-cover"
            fill
            sizes="96px"
            src={getFamilyAvatarImage(family.image)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("family.orderCart.family")}
          </p>
          <h3 className="mt-0.5 truncate text-base font-semibold text-foreground">
            {family.name}
          </h3>
          <div className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="line-clamp-2 leading-relaxed">
              {family.exactAddress}
            </span>
          </div>
          {family.phone ? (
            <div
              aria-label={t("family.orderCart.phone")}
              className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Phone aria-hidden className="size-4 shrink-0 text-primary" />
              <span dir="ltr">{family.phone}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="order-confirmation-products" className="space-y-2">
        <div className="flex items-center gap-2">
          <ShoppingBag aria-hidden className="size-4 text-primary" />
          <h3 id="order-confirmation-products" className="text-sm font-semibold">
            {t("family.orderCart.products")}
          </h3>
        </div>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {items.map((item) => (
            <OrderCartLine
              key={item.productId}
              editable={false}
              familyMode={familyMode}
              item={item}
              unavailableLabel={t("family.orderCart.unavailable")}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3 border-t border-border pt-4">
        {family.availableMinor !== null ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Wallet aria-hidden className="size-4" />
              {t("operator.budgets.available")}
            </span>
            <span className="font-medium text-foreground">
              {formatMad(family.availableMinor)}
            </span>
          </div>
        ) : null}
      </section>

      <div className="flex gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>{t("family.orderCart.confirmationNotice")}</p>
      </div>
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
  const [selectedFamilySummary, setSelectedFamilySummary] =
    useState<AssistedFamilySelection | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const familyBudget = useOwnFamilyBudgetSummary({
    enabled: open && isExactFamily,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const ownFamily = useOwnFamilyProfile({
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
  const reviewLabel = t("family.orderCart.review");
  const confirmLabel = t("family.orderCart.confirm");
  const confirmPendingLabel = t("family.orderCart.confirming");
  const backToCartLabel = t("family.orderCart.backToCart");
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
          setSelectedFamilySummary(null);
        }
        setReviewing(false);
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
    setSelectedFamilySummary(null);
    setReviewing(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setReviewing(false);
    onOpenChange(nextOpen);
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
  const confirmationFamily: OrderConfirmationFamily | null = isExactFamily
    ? ownFamily.data
      ? {
          name: ownFamily.data.name || ownFamily.data.guardianLegalName,
          image: ownFamily.data.image,
          exactAddress: ownFamily.data.exactAddress,
          phone: ownFamily.data.phone,
          availableMinor: familyBudget.data?.availableMinor ?? null,
        }
      : null
    : selectedFamilySummary
      ? {
          name: selectedFamilySummary.name,
          image: selectedFamilySummary.image,
          exactAddress: selectedFamilySummary.exactAddress,
          phone: selectedFamilySummary.phone,
          availableMinor: selectedFamilySummary.availableMinor,
        }
      : null;
  const canReview = canSaveAssisted && Boolean(confirmationFamily);
  const showReview = reviewing && confirmationFamily !== null;
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
        hasAnyItems && showReview ? (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <NButton
              className="flex-1"
              disabled={saving}
              type="button"
              variant="outline"
              onClick={() => setReviewing(false)}
            >
              <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />
              {backToCartLabel}
            </NButton>
            <NButton
              className="flex-1"
              disabled={!canSaveAssisted || saving}
              loading={saving}
              loadingText={confirmPendingLabel}
              type="button"
              onClick={handleSave}
            >
              <CheckCircle2 aria-hidden className="size-4" />
              <span className="flex min-w-0 items-center gap-1.5">
                <span>{confirmLabel}</span>
                <span className="font-bold">
                  {formatMad(orderCart.estimatedTotalMinor)}
                </span>
              </span>
            </NButton>
          </div>
        ) : hasAnyItems ? (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{unitsLabel}</span>
              <span className="font-semibold text-foreground">
                {totalsLabel}: {formatMad(orderCart.estimatedTotalMinor)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <NButton type="button" variant="outline" onClick={handleReset}>
                <Trash2 aria-hidden className="size-4" />
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
                    disabled={!canReview || saving}
                    type="button"
                    onClick={() => setReviewing(true)}
                  >
                    <ClipboardCheck aria-hidden className="size-4" />
                    {reviewLabel}
                    <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
                  </NButton>
                </span>
              </SimpleTooltip>
            </div>
          </div>
        ) : undefined
      }
      icon={showReview ? ClipboardCheck : ShoppingCart}
      open={open}
      onOpenChange={handleOpenChange}
      side="right"
      title={showReview ? reviewLabel : t("nav.cart")}
      width={440}
    >
      {!hasAnyItems ? (
        <NEmptyState
          className="py-8"
          description={cartEmptyHint}
          icon={ShoppingCart}
        />
      ) : showReview && confirmationFamily ? (
        <OrderConfirmationStep
          family={confirmationFamily}
          familyMode={isExactFamily}
          items={orderCart.items}
        />
      ) : (
        <div className="space-y-3">
          {showAssistedFields ? (
            <AssistedFamilySelector
              value={selectedFamily}
              onChange={setSelectedFamily}
              onFundingEligibilityChange={setSelectedFamilyFundingEligible}
              onSelectionChange={setSelectedFamilySummary}
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
