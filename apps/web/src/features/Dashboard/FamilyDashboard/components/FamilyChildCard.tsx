"use client";

import { ChildCard } from "@/features/Children/components/ChildCard";

import type { FamilyChildRecord } from "../types";

export function FamilyChildCard({
  child,
}: Readonly<{ child: FamilyChildRecord }>) {
  return (
    <ChildCard
      embedded={false}
      data={{
        ...child,
        notes: null,
        familyStatus: "active",
      }}
    />
  );
}
