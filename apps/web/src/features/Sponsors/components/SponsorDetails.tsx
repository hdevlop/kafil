"use client";

import {
  Contact,
  FileKey2,
  MapPin,
  NotebookPen,
} from "lucide-react";
import {
  NAvatar,
  NBadge,
  NDetailList,
  NSection,
  useNajmFormat,
} from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

import type { SponsorRecord } from "../types";

export function SponsorDetails({ sponsor }: Readonly<{ sponsor: SponsorRecord }>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        <NAvatar
          src={getPersonImage({ image: sponsor.image, role: "adult", gender: sponsor.gender })}
          title={sponsor.name}
          size="xl"
          classNames={{ avatar: "bg-muted" }}
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{sponsor.name}</p>
          <p className="truncate text-sm text-muted-foreground">{sponsor.email}</p>
          <NBadge className="mt-2" status={sponsor.status} />
        </div>
      </div>

      <NSection icon={Contact} title={t("operator.sponsors.profile")}>
        <NDetailList
          items={[
            { label: t("operator.sponsors.phone"), value: sponsor.phone || t("operator.sponsors.notProvided") },
            {
              label: t("operator.sponsors.gender"),
              value: sponsor.gender === "F" ? t("operator.sponsors.female") : sponsor.gender === "M" ? t("operator.sponsors.male") : t("operator.sponsors.notProvided"),
            },
            { label: t("operator.sponsors.dateOfBirth"), value: fmt.date(sponsor.dateOfBirth) },
            { label: t("operator.sponsors.created"), value: fmt.date(sponsor.createdAt) },
          ]}
        />
      </NSection>

      <NSection icon={FileKey2} title={t("operator.sponsors.privateVerification")}>
        <NDetailList items={[{ label: t("operator.sponsors.cin"), value: sponsor.cin || t("operator.sponsors.notProvided") }]} />
      </NSection>

      <NSection icon={MapPin} title={t("operator.sponsors.address")}>
        <NDetailList items={[{ label: t("operator.sponsors.address"), value: sponsor.address || t("operator.sponsors.notProvided") }]} />
      </NSection>

      <NSection icon={NotebookPen} title={t("operator.sponsors.operatorNotes")}>
        <NDetailList items={[{ label: t("operator.sponsors.notes"), value: sponsor.notes || t("operator.sponsors.noOperatorNotes") }]} />
      </NSection>
    </div>
  );
}
