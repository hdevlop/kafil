"use client";

import { Barcode, FolderTree, Package, ReceiptText } from "lucide-react";
import Image from "next/image";
import { NCard, NCardAction, NCardInfo, NCardMedia, NCardSection } from "najm-kit";

import { formatMad } from "@/lib/format";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ProductRecord } from "../types";

export function ProductCard({ data }: Readonly<{ data: ProductRecord }>) {
  return (
    <NCard embedded title={data.name} description={formatMad(data.priceMinor)}>
      <NCardMedia variant="avatar" size="sm">
        {data.imageUrl ? (
          <Image
            alt={data.name}
            className="size-14 shrink-0 rounded-xl object-cover"
            src={data.imageUrl}
            width={56}
            height={56}
            unoptimized
          />
        ) : (
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Package className="size-5" />
          </div>
        )}
      </NCardMedia>
      <NCardAction>
        <StatusBadge status={data.status} />
      </NCardAction>
      <NCardSection>
        <NCardInfo icon={FolderTree} label="Category" value={data.categoryName} />
        <NCardInfo icon={Barcode} label="SKU" value={data.sku} />
        <NCardInfo icon={ReceiptText} label="Description" value={data.description || "No description"} />
      </NCardSection>
    </NCard>
  );
}
