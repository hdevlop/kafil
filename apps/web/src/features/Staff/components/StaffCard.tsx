"use client";

import { BriefcaseBusiness, Mail, Phone } from "lucide-react";
import {
  NAvatar,
  cn,
  NCard,
  NCardInfo,
  NCardMedia,
  NCardSection,
} from "najm-kit";

import { getPersonImage } from "najm-kit/person-images";
import { useTranslation } from "najm-i18n/react";

import type { StaffRecord } from "../types";

export function StaffCard({ data }: Readonly<{ data: StaffRecord }>) {
  const { t } = useTranslation();
  const isInactive = data.status === "inactive";

  return (
    <NCard
      embedded
      title={data.name}
      description={
        data.gender === "F"
          ? t("operator.staff.female")
          : data.gender === "M"
            ? t("operator.staff.male")
            : undefined
      }
      classNames={{
        title: "text-base font-semibold text-foreground",
        description: "hidden sm:block",
        header: "[&>div:last-child]:hidden sm:[&>div:last-child]:flex",
      }}
      className={cn(
        "w-full overflow-hidden transition-colors",
        isInactive && "bg-muted/60 text-muted-foreground opacity-60 grayscale",
      )}
    >
      <NCardMedia
        variant="avatar"
        size="sm"
        className="w-20 sm:w-[var(--n-card-media-size)]"
      >
        <NAvatar
          src={getPersonImage({ image: data.image, role: "adult", gender: data.gender })}
          alt={data.name}
          size="xl"
          classNames={{ avatar: "size-20 bg-muted sm:size-16" }}
        />
      </NCardMedia>
      <NCardSection density="responsive" surface="responsive">
        <NCardInfo
          icon={BriefcaseBusiness}
          label={t("operator.staff.role")}
          value={data.functions
            .map((functionKey) =>
              functionKey === "operator"
                ? t("operator.staff.functionOperator")
                : t("operator.staff.functionDelivery"),
            )
            .join(", ")}
        />
        <NCardInfo
          icon={Mail}
          label={t("operator.staff.email")}
          value={data.contactEmail || t("operator.staff.notProvided")}
          maxChars={30}
        />
        <NCardInfo
          icon={Phone}
          label={t("operator.staff.phone")}
          value={data.phone || t("operator.staff.notProvided")}
          maxChars={30}
        />
      </NCardSection>
    </NCard>
  );
}
