"use client";

import { useEffect, useRef, useState } from "react";
import { Package, ShoppingCart, Tag } from "lucide-react";
import { cn, NButton, NCard, NCardInfo, NCardMedia, NCardSection } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatMad } from "@/lib/format";
import { ORDER_CART_MAX_QUANTITY, ORDER_CART_MIN_QUANTITY } from "@/features/OrderCart/types";
import { ProtectedImage } from "@/shared/ProtectedImage";

import type { ProductRecord } from "../types";

export interface ProductCardAddInput {
  productId: string;
  productName: string;
  sku: string;
  imageUrl?: string | null;
  quantity: number;
  estimatedUnitPriceMinor: number;
}

interface ProductCardProps {
  data: ProductRecord;
  onAdd?: (input: ProductCardAddInput) => void | Promise<void>;
  adding?: boolean;
}

function clampQuantity(quantity: number): number {
  if (!Number.isInteger(quantity)) {
    return ORDER_CART_MIN_QUANTITY;
  }
  if (quantity < ORDER_CART_MIN_QUANTITY) return ORDER_CART_MIN_QUANTITY;
  if (quantity > ORDER_CART_MAX_QUANTITY) return ORDER_CART_MAX_QUANTITY;
  return quantity;
}

export function ProductCard({ data, onAdd, adding = false }: Readonly<ProductCardProps>) {
  const { t } = useKafilLanguage();
  const isInactive = data.status !== "active";
  const [quantity, setQuantity] = useState(ORDER_CART_MIN_QUANTITY);
  const busy = adding;
  const previousBusy = useRef(busy);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (previousBusy.current && !busy) {
      setQuantity(ORDER_CART_MIN_QUANTITY);
    }
    previousBusy.current = busy;
  }, [busy]);

  function decrement() {
    setQuantity((current) => clampQuantity(current - 1));
  }

  function increment() {
    setQuantity((current) => clampQuantity(current + 1));
  }

  async function handleAdd() {
    if (!onAdd || isInactive || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onAdd({
        productId: data.id,
        productName: data.name,
        sku: data.sku,
        imageUrl: data.imageUrl,
        quantity: clampQuantity(quantity),
        estimatedUnitPriceMinor: data.priceMinor,
      });
    } catch {
      // The shared command hook presents the localized failure toast.
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const atMaxQuantity = quantity >= ORDER_CART_MAX_QUANTITY;
  const atMinQuantity = quantity <= ORDER_CART_MIN_QUANTITY;
  const canAdd = Boolean(onAdd) && !isInactive && !busy && !submitting;
  const decreaseAriaLabel = t("family.orderCart.decrease", {
    name: data.name,
  });
  const increaseAriaLabel = t("family.orderCart.increase", {
    name: data.name,
  });
  const quantityAriaLabel = t("family.orderCart.quantityAria", {
    name: data.name,
  });
  const addToCartLabel = t("family.orderCart.addToCart", {
    name: data.name,
  });

  return (
    <NCard
      embedded
      noPadding
      title={data.name}
      description={formatMad(data.priceMinor)}
      classNames={{
        header: "items-start px-2.5 pb-0 pt-2 sm:px-3 sm:pt-2.5",
        title: "text-sm font-semibold leading-tight text-foreground",
        description:
          "mt-1 text-base font-bold leading-none text-emerald-600 dark:text-emerald-400",
        content: "gap-0 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5",
      }}
      className={cn(
        "w-full overflow-hidden transition-all hover:border-primary/40 hover:shadow-sm",
        isInactive && "bg-muted/60 text-muted-foreground opacity-60 grayscale",
      )}
    >
      <NCardMedia
        variant="hero"
        placement="top"
        aspect="square"
        className="mx-2.5 mt-2.5 w-[calc(100%-1.25rem)] rounded-lg bg-muted sm:mx-3 sm:mt-3 sm:w-[calc(100%-1.5rem)]"
        style={{ aspectRatio: "1 / 1" }}
      >
        {data.imageUrl ? (
          <ProtectedImage
            alt={data.name}
            className="size-full object-contain"
            fill
            sizes="(max-width: 640px) calc(50vw - 1.5rem), (max-width: 1024px) 50vw, 25vw"
            src={data.imageUrl}
          />
        ) : (
          <div className="grid size-full place-items-center bg-muted text-muted-foreground">
            <Package aria-hidden="true" className="size-12" />
          </div>
        )}
      </NCardMedia>

      <NCardSection density="compact" surface="plain" className="pb-2">
        <NCardInfo
          icon={Tag}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          maxChars={18}
          value={data.categoryName}
          valueClassName="font-medium"
        />
      </NCardSection>

      <NCardSection density="compact" surface="plain" className="border-t border-border pt-2">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center overflow-hidden rounded-lg border border-input">
            <NButton
              aria-label={decreaseAriaLabel}
              className="size-8"
              disabled={busy || submitting || atMinQuantity}
              onClick={decrement}
              size="icon"
              type="button"
              variant="ghost"
            >
              −
            </NButton>
            <span
              aria-label={quantityAriaLabel}
              aria-live="polite"
              className="flex size-8 items-center justify-center border-x border-input text-xs font-semibold tabular-nums"
            >
              {quantity}
            </span>
            <NButton
              aria-label={increaseAriaLabel}
              className="size-8"
              disabled={busy || submitting || atMaxQuantity}
              onClick={increment}
              size="icon"
              type="button"
              variant="ghost"
            >
              +
            </NButton>
          </div>
          {onAdd ? (
            <NButton
              aria-label={addToCartLabel}
              className="size-8"
              disabled={!canAdd}
              onClick={() => void handleAdd()}
              size="icon"
            >
              <ShoppingCart className="size-4" />
            </NButton>
          ) : null}
        </div>
      </NCardSection>
    </NCard>
  );
}
