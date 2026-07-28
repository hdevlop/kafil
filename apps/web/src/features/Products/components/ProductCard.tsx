"use client";

import { useEffect, useRef, useState } from "react";
import { Package, ShoppingCart, Tag } from "lucide-react";
import Image from "next/image";
import { usePermissions } from "najm-auth/client/react";
import { cn, NButton, NCard, NCardInfo, NCardMedia, NCardSection } from "najm-kit";

import { useFamilyOrderingCommands } from "@/features/FamilyOrdering/hooks/useFamilyOrdering";
import { formatMad } from "@/lib/format";

import type { ProductRecord } from "../types";

export function ProductCard({ data }: Readonly<{ data: ProductRecord }>) {
  const isInactive = data.status !== "active";
  const { hasRole } = usePermissions();
  const { add } = useFamilyOrderingCommands();
  const canPurchase = hasRole("family");
  const [quantity, setQuantity] = useState(1);
  const busy = add.isPending;
  const previousBusy = useRef(busy);

  useEffect(() => {
    if (previousBusy.current && !busy) {
      setQuantity(1);
    }
    previousBusy.current = busy;
  }, [busy]);

  function decrement() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increment() {
    setQuantity((current) => current + 1);
  }

  function handleAdd() {
    if (!canPurchase || isInactive) return;
    void add.mutateAsync({ productId: data.id, quantity });
  }

  return (
    <NCard
      embedded
      noPadding
      title={data.name}
      description={formatMad(data.priceMinor)}
      classNames={{
        header: "items-start px-3 pb-0 pt-2.5 sm:px-4 sm:pt-3",
        title: "text-base font-semibold leading-tight text-foreground sm:text-lg",
        description:
          "mt-1 text-lg font-bold leading-none text-emerald-600 dark:text-emerald-400 sm:text-xl",
        content: "gap-0 px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4 sm:pt-3",
      }}
      className={cn(
        "w-full overflow-hidden transition-colors",
        isInactive && "bg-muted/60 text-muted-foreground opacity-60 grayscale",
      )}
    >
      <NCardMedia
        variant="hero"
        placement="top"
        aspect="16/9"
      >
        {data.imageUrl ? (
          <Image
            alt={data.name}
            className="size-full object-cover"
            fill
            sizes="(max-width: 640px) calc(50vw - 1.5rem), (max-width: 1024px) 50vw, 25vw"
            src={data.imageUrl}
            unoptimized
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Package aria-hidden="true" className="size-12" />
          </div>
        )}
      </NCardMedia>

      <NCardSection density="responsive" surface="plain">
        <NCardInfo
          icon={Tag}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          label="Category"
          value={data.categoryName}
        />
      </NCardSection>

      <NCardSection density="responsive" surface="plain" className="border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center overflow-hidden rounded-lg border border-input">
            <button
              aria-label="Decrease quantity"
              className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy || quantity <= 1}
              onClick={decrement}
              type="button"
            >
              −
            </button>
            <span
              aria-live="polite"
              className="flex h-9 w-10 items-center justify-center border-x border-input text-sm font-medium tabular-nums"
            >
              {quantity}
            </span>
            <button
              aria-label="Increase quantity"
              className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              onClick={increment}
              type="button"
            >
              +
            </button>
          </div>
          <NButton
            aria-label="Add to cart"
            disabled={!canPurchase || busy || isInactive}
            onClick={handleAdd}
            size="sm"
            title={canPurchase ? undefined : "Add to cart is available to families only"}
          >
            <ShoppingCart className="size-4" />
          </NButton>
        </div>
      </NCardSection>
    </NCard>
  );
}
