"use client";

import { Package, Tags } from "lucide-react";
import { cn, NCard, NCardMedia, NCardSection, useNajmFormat } from "najm-kit";
import type { CategoryRecord } from "../types";
import { ProtectedImage } from "@/shared/ProtectedImage";

interface CategoryCardData {
  name: string;
  image?: string | null;
  itemCount?: number | string | null;
  status?: string | null;
}

export function CategoryCard({
  data,
  compact = false,
}: Readonly<{
  data: CategoryCardData | CategoryRecord;
  compact?: boolean;
}>) {
  const fmt = useNajmFormat();
  const isInactive = (data.status ?? "active") !== "active";
  const itemCount = Number(data.itemCount ?? 0);

  if (compact) {
    return (
      <NCard
        embedded
        noPadding
        className={cn(
          "relative aspect-square w-full overflow-hidden",
          isInactive && "opacity-60 grayscale",
        )}
      >
        <NCardMedia
          aspect="square"
          className="absolute inset-0 size-full rounded-none bg-muted"
          placement="top"
          variant="hero"
        >
          {data.image ? (
            <ProtectedImage
              alt={`Cover image for ${data.name}`}
              className="size-full object-cover"
              fill
              sizes="120px"
              src={data.image}
            />
          ) : (
            <div className="grid size-full place-items-center bg-muted text-muted-foreground">
              <Tags aria-hidden="true" className="size-7" />
            </div>
          )}
        </NCardMedia>
        <div className="absolute inset-x-0 bottom-0 bg-background/90 px-2 py-1.5 backdrop-blur-sm">
          <p className="truncate text-xs font-semibold text-foreground" title={data.name}>
            {data.name}
          </p>
        </div>
      </NCard>
    );
  }

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
          <ProtectedImage
            alt={`Cover image for ${data.name}`}
            className="size-full object-contain"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            src={data.image}
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
            {fmt.number(itemCount)} items
          </p>
        </div>
      </NCardSection>
    </NCard>
  );
}
