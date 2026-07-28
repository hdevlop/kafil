"use client";

import { useEffect, useRef, useState } from "react";
import { Package, ShoppingCart } from "lucide-react";
import { NAvatar, NButton, NCard } from "najm-kit";

import { formatMad } from "@/lib/format";

import type { FamilyCatalogProduct } from "../types";

export function FamilyCatalogProductCard({
  adding,
  onAdd,
  product,
}: Readonly<{
  adding?: boolean;
  onAdd?: (productId: string, quantity: number) => void;
  product: FamilyCatalogProduct;
}>) {
  const [quantity, setQuantity] = useState(1);
  const busy = adding === true;
  const previousAdding = useRef(busy);

  useEffect(() => {
    if (previousAdding.current && !busy) {
      setQuantity(1);
    }
    previousAdding.current = busy;
  }, [busy]);

  function decrement() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increment() {
    setQuantity((current) => current + 1);
  }

  return (
    <NCard className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        <NAvatar
          size="lg"
          src={product.imageUrl ?? undefined}
          title={product.name}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{product.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {product.categoryName}
          </p>
        </div>
        <Package className="mt-1 size-5 shrink-0 text-primary" />
      </div>

      <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">
        {product.description || "No product description provided."}
      </p>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-lg font-semibold">{formatMad(product.priceMinor)}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
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
          {onAdd ? (
            <NButton
              aria-label="Add to cart"
              disabled={busy}
              onClick={() => onAdd(product.id, quantity)}
              size="sm"
            >
              <ShoppingCart className="size-4" />
            </NButton>
          ) : null}
        </div>
      </div>
    </NCard>
  );
}
