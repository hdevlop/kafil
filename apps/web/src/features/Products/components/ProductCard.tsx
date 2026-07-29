"use client";

import { useRef, useState } from "react";
import { Package, ShoppingCart, Tag } from "lucide-react";
import { cn, NButton, NCard, NCardInfo, NCardMedia, NCardSection } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatMad } from "@/lib/format";
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
  onOpenCart?: () => void;
  quantityInCart?: number;
  adding?: boolean;
}

export function ProductCard({
  data,
  onAdd,
  onOpenCart,
  quantityInCart = 0,
  adding = false,
}: Readonly<ProductCardProps>) {
  const { t } = useKafilLanguage();
  const isInactive = data.status !== "active";
  const busy = adding;
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const hasCartItem = quantityInCart > 0;

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
        quantity: 1,
        estimatedUnitPriceMinor: data.priceMinor,
      });
    } catch {
      // The shared command hook presents the localized failure toast.
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleAction() {
    if (hasCartItem) {
      onOpenCart?.();
      return;
    }
    void handleAdd();
  }

  const canInteract = hasCartItem
    ? Boolean(onOpenCart) && !busy
    : Boolean(onAdd) && !isInactive && !busy && !submitting;
  const addToCartLabel = t("family.orderCart.addToCart", {
    name: data.name,
  });
  const actionLabel = hasCartItem
    ? t("family.orderCart.inCart", { count: quantityInCart })
    : t("family.orderCart.add");
  const actionAriaLabel = hasCartItem
    ? t("family.orderCart.openCartFor", {
        count: quantityInCart,
        name: data.name,
      })
    : addToCartLabel;

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

      {onAdd ? (
        <NCardSection density="compact" surface="plain" className="border-t border-border pt-2">
          <NButton
            aria-label={actionAriaLabel}
            disabled={!canInteract}
            fullWidth
            leftIcon={ShoppingCart}
            loading={submitting}
            onClick={handleAction}
            size="sm"
            type="button"
            variant={hasCartItem ? "soft" : "success"}
          >
            {actionLabel}
          </NButton>
        </NCardSection>
      ) : null}
    </NCard>
  );
}
