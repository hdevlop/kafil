"use client";

import { CalendarDays, GraduationCap, Ruler } from "lucide-react";
import { NAvatar, NSectionInfo } from "najm-kit";

import { formatKafilDate } from "@/lib/format";
import { getChildAvatarImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";

import type { FamilyChildRecord } from "../types";

export function FamilyChildCard({
  child,
}: Readonly<{ child: FamilyChildRecord }>) {
  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex items-center gap-3">
        <NAvatar
          src={getChildAvatarImage(child.image, child.gender)}
          title={child.legalName}
          subtitle={child.gender === "F" ? "Female" : "Male"}
          classNames={{ avatar: "bg-muted" }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{child.legalName}</p>
          <p className="text-sm text-muted-foreground">
            {child.gender === "F" ? "Female" : "Male"}
          </p>
        </div>
        <StatusBadge status={child.status} />
      </div>
      <div className="space-y-2 rounded-xl bg-muted/50 p-3">
        <NSectionInfo icon={CalendarDays} label="Date of birth" value={formatKafilDate(child.dateOfBirth)} />
        <NSectionInfo icon={GraduationCap} label="School level" value={child.schoolLevel || "Not provided"} />
        <NSectionInfo
          icon={Ruler}
          label="Clothing and shoe size"
          value={[child.clothingSize, child.shoeSize].filter(Boolean).join(" / ") || "Not provided"}
        />
      </div>
    </article>
  );
}
