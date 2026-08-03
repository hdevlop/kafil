"use client";

import { Contact, FileKey2, MapPin, UserRoundSearch } from "lucide-react";
import { NDetailList, NSection } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate } from "@/lib/format";
import { getSponsorPersonImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ApplicantRecord } from "../types";

export function ApplicantDetails({ applicant }: Readonly<{ applicant: ApplicantRecord }>) {
  const { language, t } = useKafilLanguage();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        <ManagedAvatar
          src={getSponsorPersonImage(applicant.gender)}
          title={applicant.name}
          size="xl"
          classNames={{ avatar: "bg-muted" }}
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{applicant.name}</p>
          <p className="truncate text-sm text-muted-foreground">{applicant.email}</p>
          <StatusBadge className="mt-2" status={applicant.status} />
        </div>
      </div>

      <NSection icon={Contact} title={t("operator.applicants.contact")}>
        <NDetailList
          items={[
            { label: t("operator.applicants.email"), value: applicant.email },
            { label: t("operator.applicants.phone"), value: applicant.phone },
            {
              label: t("operator.applicants.gender"),
              value: applicant.gender === "F"
                ? t("operator.applicants.female")
                : t("operator.applicants.male"),
            },
            {
              label: t("operator.applicants.dateOfBirth"),
              value: formatKafilDate(applicant.dateOfBirth, language),
            },
          ]}
        />
      </NSection>

      <NSection icon={FileKey2} title={t("operator.applicants.privateVerification")}>
        <NDetailList items={[{ label: t("operator.applicants.cin"), value: applicant.cin }]} />
      </NSection>

      <NSection icon={MapPin} title={t("operator.applicants.address")}>
        <NDetailList items={[{ label: t("operator.applicants.address"), value: applicant.address }]} />
      </NSection>

      <NSection icon={UserRoundSearch} title={t("operator.applicants.review")}>
        <NDetailList
          items={[
            {
              label: t("operator.applicants.submitted"),
              value: formatKafilDate(applicant.submittedAt, language),
            },
            {
              label: t("operator.applicants.reviewed"),
              value: applicant.reviewedAt
                ? formatKafilDate(applicant.reviewedAt, language)
                : t("operator.applicants.notReviewed"),
            },
            ...(applicant.rejectionReason
              ? [{
                  label: t("operator.applicants.rejectionReason"),
                  value: applicant.rejectionReason,
                }]
              : []),
          ]}
        />
      </NSection>
    </div>
  );
}
