"use client";

import { Package, Tags } from "lucide-react";
import Image from "next/image";
import { cn, NCard, NCardMedia, NCardSection } from "najm-kit";

import { formatKafilNumber } from "@/lib/format";

import type { CategoryRecord } from "../types";

export function CategoryCard({ data }: Readonly<{ data: CategoryRecord }>) {
  const isInactive = data.status !== "active";
  const itemCount = Number(data.itemCount ?? 0);

  return (
    <NCard
      embedded
      noPadding
      classNames={{ content: "gap-0 px-4 py-4" }}
      className={cn(
        "w-full overflow-hidden transition-colors",
        isInactive && "bg-muted/60 text-muted-foreground opacity-60 grayscale",
      )}
    >
      <NCardMedia
        variant="hero"
        placement="top"
        aspect="square"
        className="mx-3 mt-3 w-[calc(100%-1.5rem)] rounded-xl bg-muted sm:mx-4 sm:mt-4 sm:w-[calc(100%-2rem)]"
      >
        {data.image ? (
          <Image
            alt={`Cover image for ${data.name}`}
            className="size-full object-contain"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            src={data.image}
            unoptimized
          />
        ) : (
          <div className="grid size-full place-items-center bg-muted text-muted-foreground">
            <Tags aria-hidden="true" className="size-10" />
          </div>
        )}
      </NCardMedia>

      <NCardSection
        density="compact"
        surface="plain"
        className="flex min-h-6 flex-col gap-1 space-y-0 2xl:flex-row"
      >
        <div className="flex w-full min-w-0 items-center gap-1.5 xl:flex-1">
          <Tags aria-hidden="true" className="size-4 shrink-0 self-center text-primary" />
          <p className="min-w-0 flex-1 truncate text-base font-semibold leading-5 text-foreground">
            {data.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-primary">
          <Package aria-hidden="true" className="size-3 shrink-0" />
          <p className="text-xs font-semibold leading-5">
            {formatKafilNumber(itemCount)} items
          </p>
        </div>
      </NCardSection>
    </NCard>
  );
}
