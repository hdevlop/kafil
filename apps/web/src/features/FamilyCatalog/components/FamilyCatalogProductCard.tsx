"use client";

import { Package } from "lucide-react";
import { NAvatar, NButton, NCard } from "najm-kit";

import { formatMad } from "@/lib/format";

import type { FamilyCatalogProduct } from "../types";

export function FamilyCatalogProductCard({
  adding,
  onAdd,
  product,
}: Readonly<{ adding?: boolean; onAdd?: (productId: string) => void; product: FamilyCatalogProduct }>) {
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
        <div className="mt-2 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Active catalog item</p>{onAdd ? <NButton size="sm" disabled={adding} onClick={() => onAdd(product.id)}>{adding ? "Adding..." : "Add to cart"}</NButton> : null}</div>
      </div>
    </NCard>
  );
}
