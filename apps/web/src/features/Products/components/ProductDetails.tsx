"use client";

import { Barcode, CalendarDays, FolderTree, Image as ImageIcon, Package, ReceiptText } from "lucide-react";
import { NDetailList, NSection, useNajmFormat } from "najm-kit";

import { StatusBadge } from "@/shared/StatusBadge";
import { ProtectedImage } from "@/shared/ProtectedImage";

import type { ProductRecord } from "../types";

export function ProductDetails({ product }: Readonly<{ product: ProductRecord }>) {
  const fmt = useNajmFormat();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        {product.imageUrl ? (
          <ProtectedImage
            alt={product.name}
            className="size-12 shrink-0 rounded-xl object-cover"
            height={48}
            src={product.imageUrl}
            width={48}
          />
        ) : (
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Package className="size-6" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{product.name}</p>
          <p className="truncate text-sm text-muted-foreground">{fmt.money(product.priceMinor)}</p>
          <StatusBadge className="mt-2" status={product.status} />
        </div>
      </div>

      <NSection icon={FolderTree} title="Catalog placement">
        <NDetailList
          items={[
            { label: "Category", value: product.categoryName },
            { label: "Category slug", value: product.categorySlug },
            { label: "SKU", value: product.sku },
            { label: "Current price", value: fmt.money(product.priceMinor) },
          ]}
        />
      </NSection>

      <NSection icon={ReceiptText} title="Product details">
        <NDetailList items={[{ label: "Description", value: product.description || "No description" }]} />
      </NSection>

      <NSection icon={ImageIcon} title="Image">
        <NDetailList items={[{ label: "Image URL", value: product.imageUrl || "No image URL" }]} />
      </NSection>

      <NSection icon={CalendarDays} title="History">
        <NDetailList
          items={[
            { label: "Created", value: fmt.date(product.createdAt) },
            { label: "Last updated", value: fmt.date(product.updatedAt) },
          ]}
        />
      </NSection>

      <NSection icon={Barcode} title="Lifecycle">
        <NDetailList items={[{ label: "Current status", value: product.status }]} />
      </NSection>
    </div>
  );
}
