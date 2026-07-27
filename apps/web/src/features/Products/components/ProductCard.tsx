"use client";

import { Package, Tag } from "lucide-react";
import Image from "next/image";
import { cn, NCard, NCardInfo, NCardMedia, NCardSection } from "najm-kit";
import { formatMad } from "@/lib/format";

import type { ProductRecord } from "../types";

export function ProductCard({ data }: Readonly<{ data: ProductRecord }>) {
  const isInactive = data.status !== "active";

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
    </NCard>
  );
}
