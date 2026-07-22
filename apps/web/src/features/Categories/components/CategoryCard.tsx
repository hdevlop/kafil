"use client";

import { AlignJustify, ListOrdered, Tags } from "lucide-react";
import Image from "next/image";
import { NCard, NCardAction, NCardInfo, NCardMedia, NCardSection } from "najm-kit";

import { StatusBadge } from "@/shared/StatusBadge";

import type { CategoryRecord } from "../types";

export function CategoryCard({ data }: Readonly<{ data: CategoryRecord }>) {
  return (
    <NCard embedded title={data.name} description={data.slug}>
      <NCardMedia variant="avatar" size="sm">
        {data.image ? (
          <Image
            alt={data.name}
            className="size-14 shrink-0 rounded-xl object-cover"
            src={data.image}
            width={56}
            height={56}
            unoptimized
          />
        ) : (
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Tags className="size-5" />
          </div>
        )}
      </NCardMedia>
      <NCardAction>
        <StatusBadge status={data.status} />
      </NCardAction>
      <NCardSection>
        <NCardInfo icon={ListOrdered} label="Display order" value={String(data.sortOrder)} />
        <NCardInfo icon={AlignJustify} label="Description" value={data.description || "No description"} />
      </NCardSection>
    </NCard>
  );
}
