"use client";

import { BadgeCheck, HeartHandshake, House } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NAvatar, NDetailItem, NSection } from "najm-kit";

import { useContributions } from "@/features/Contributions/hooks/useContributions";
import { formatKafilDate, formatMad } from "@/lib/format";
import { getFamilyAvatarImage, getSponsorAvatarImage } from "@/lib/personImages";
import { getStatusTextColor } from "@/lib/status";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { StatusBadge } from "@/shared/StatusBadge";

import type { FamilyRecord } from "../types";

const DETAIL_MAX_CHARS = 30;

export function FamilyDetails({ family }: Readonly<{ family: FamilyRecord }>) {
  const { language, t } = useKafilLanguage();
  const fundingStatus = family.funding?.status === "active" ? "active" : "pending";
  const contributions = useContributions({
    familyProfileId: family.id,
    limit: 3,
    offset: 0,
  });

  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-border/70">
      <div className="space-y-3 lg:pr-4">
        <section className="space-y-2">
          <div className="relative h-52 overflow-hidden rounded-2xl bg-muted sm:h-60">
            <Image
              src={getFamilyAvatarImage(
                family.image,
                family.relationshipToChildren,
              )}
              alt={family.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="truncate text-lg font-semibold text-foreground">{family.name}</h2>
              {fundingStatus === "active" ? (
                <BadgeCheck
                  aria-hidden
                  className="size-4 shrink-0 fill-primary text-primary-foreground"
                />
              ) : null}
            </div>
            <StatusBadge className="shrink-0" status={fundingStatus} />
          </div>
        </section>

        {family.funding ? <FundingProgressBar inline progress={family.funding} /> : null}

        <section className="rounded-2xl border border-border/70 bg-card p-3">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t("operator.families.recentSponsorContributions")}
            </h3>
            <Link
              className="text-xs font-medium text-primary hover:underline"
              href={`/operator/contributions?family=${family.id}`}
            >
              {t("operator.families.viewAllContributions")}
            </Link>
          </div>
          {contributions.isPending ? (
            <p className="py-5 text-center text-sm text-muted-foreground">
              {t("operator.families.loadingContributions")}
            </p>
          ) : contributions.data?.length ? (
            <div className="divide-y divide-border/70">
              {contributions.data.map((contribution) => (
                <div className="flex items-center gap-3 py-2" key={contribution.id}>
                  <NAvatar
                    alt={contribution.sponsorName}
                    classNames={{ avatar: "bg-muted" }}
                    size="sm"
                    src={getSponsorAvatarImage(
                      contribution.sponsorImage,
                      contribution.sponsorGender,
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {contribution.sponsorName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatKafilDate(contribution.paidAt ?? contribution.submittedAt, language)}
                    </p>
                  </div>
                  <p className={[
                    "shrink-0 text-sm font-semibold",
                    getStatusTextColor(contribution.status),
                  ].join(" ")}>
                    +{formatMad(contribution.amountMinor, language)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-5 text-center text-sm text-muted-foreground">
              {t("operator.families.noSponsorContributions")}
            </p>
          )}
        </section>
      </div>

      <div className="space-y-3 lg:pl-4">
        <NSection icon={House} title={t("operator.families.account")}>
          <NDetailItem
            label={t("operator.families.email")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.email}
          />
          <NDetailItem
            label={t("operator.families.cin")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.guardianCin || t("operator.families.notProvided")}
          />
          <NDetailItem
            label={t("operator.families.phone")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.phone || t("operator.families.notProvided")}
          />
          <NDetailItem
            label={t("operator.families.exactAddress")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.exactAddress}
          />
        </NSection>

        <NSection icon={HeartHandshake} title={t("operator.families.profile")}>
          <NDetailItem
            label={t("operator.families.children")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.activeChildCount}
          />
          <NDetailItem
            label={t("operator.families.sponsors")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.activeSponsorCount}
          />
          <NDetailItem
            label={t("operator.families.sponsorNames")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.activeSponsorNames?.join(", ") || t("operator.families.notProvided")}
          />
          <NDetailItem
            label={t("operator.families.relationship")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.relationshipToChildren || t("operator.families.notProvided")}
          />
          <NDetailItem
            label={t("operator.families.notes")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.notes || t("operator.families.noNotes")}
          />
          <NDetailItem
            label={t("operator.families.created")}
            maxChars={DETAIL_MAX_CHARS}
            value={formatKafilDate(family.createdAt)}
          />
        </NSection>
      </div>
    </div>
  );
}
