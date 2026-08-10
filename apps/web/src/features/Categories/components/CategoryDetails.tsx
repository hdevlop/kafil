"use client";

import {
  AlignJustify,
  CalendarDays,
  ListOrdered,
  Tags,
} from "lucide-react";
import {
  NBadge,
  NDetailList,
  NSection,
  useNajmFormat,
} from "najm-kit";

import { NNextImage } from "najm-kit/next";

import type { CategoryRecord } from "../types";

export function CategoryDetails({ category }: Readonly<{ category: CategoryRecord }>) {
  const fmt = useNajmFormat();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        {category.image ? (
          <NNextImage unoptimized
            alt={category.name}
            className="size-12 shrink-0 rounded-xl object-cover"
            height={48}
            src={category.image}
            width={48}
          />
        ) : (
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Tags className="size-6" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{category.name}</p>
          <p className="truncate text-sm text-muted-foreground">{category.slug}</p>
          <NBadge className="mt-2" status={category.status} />
        </div>
      </div>

      <NSection icon={AlignJustify} title="Catalog category">
        <NDetailList
          items={[
            { label: "Description", value: category.description || "No description" },
            { label: "Slug", value: category.slug },
            { label: "Display order", value: String(category.sortOrder) },
          ]}
        />
      </NSection>

      <NSection icon={CalendarDays} title="History">
        <NDetailList
          items={[
            { label: "Created", value: fmt.date(category.createdAt) },
            { label: "Last updated", value: fmt.date(category.updatedAt) },
          ]}
        />
      </NSection>

      <NSection icon={ListOrdered} title="Lifecycle">
        <NDetailList items={[{ label: "Current status", value: category.status }]} />
      </NSection>
    </div>
  );
}
