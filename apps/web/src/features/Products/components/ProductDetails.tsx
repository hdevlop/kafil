"use client";

import {
  Barcode,
  CalendarDays,
  FolderTree,
  Image as ImageIcon,
  Package,
  ReceiptText,
} from "lucide-react";
import {
  NBadge,
  NDetailList,
  NSection,
  useNajmFormat,
} from "najm-kit";

import { NNextImage } from "najm-kit/next";

import { useTranslation } from "najm-i18n/react";
import type { ProductRecord } from "../types";

export function ProductDetails({ product }: Readonly<{ product: ProductRecord }>) {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        {product.imageUrl ? (
          <NNextImage unoptimized
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
          <NBadge className="mt-2" status={product.status} />
        </div>
      </div>

      <NSection icon={FolderTree} title={t("operator.products.catalogPlacement")}>
        <NDetailList
          items={[
            { label: t("operator.products.category"), value: product.categoryName },
            { label: t("operator.products.categorySlug"), value: product.categorySlug },
            { label: t("operator.products.sku"), value: product.sku },
            { label: t("operator.products.currentPrice"), value: fmt.money(product.priceMinor) },
          ]}
        />
      </NSection>

      <NSection icon={ReceiptText} title={t("operator.products.productDetails")}>
        <NDetailList items={[{ label: t("operator.products.description"), value: product.description || t("operator.products.noDescription") }]} />
      </NSection>

      <NSection icon={ImageIcon} title={t("operator.products.image")}>
        <NDetailList items={[{ label: t("operator.products.imageUrl"), value: product.imageUrl || t("operator.products.noImageUrl") }]} />
      </NSection>

      <NSection icon={CalendarDays} title={t("operator.products.history")}>
        <NDetailList
          items={[
            { label: t("operator.products.created"), value: fmt.date(product.createdAt) },
            { label: t("operator.products.lastUpdated"), value: fmt.date(product.updatedAt) },
          ]}
        />
      </NSection>

      <NSection icon={Barcode} title={t("operator.products.lifecycle")}>
        <NDetailList items={[{ label: t("operator.products.currentStatus"), value: product.status }]} />
      </NSection>
    </div>
  );
}
