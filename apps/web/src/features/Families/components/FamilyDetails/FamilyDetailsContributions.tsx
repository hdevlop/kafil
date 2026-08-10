import { NAvatar, statusTextClass, useNajmFormat } from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";
import Link from "next/link";

import { useContributions } from "@/features/Contributions/hooks/useContributions";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";

import type { FamilyRecord } from "../../types";

export function FamilyDetailsContributions({
  family,
}: Readonly<{ family: FamilyRecord }>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  const contributions = useContributions({
    familyProfileId: family.id,
    limit: 3,
    offset: 0,
  });

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t("operator.families.recentSponsorContributions")}
        </h3>
        <Link
          className="text-xs font-medium text-primary hover:underline"
          href={`/contribution?family=${family.id}`}
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
            <div
              className="flex items-center gap-3 py-2"
              key={contribution.id}
            >
              <NAvatar
                alt={contribution.sponsorName}
                classNames={{ avatar: "bg-muted" }}
                size="sm"
                src={getPersonImage({ image: contribution.sponsorImage, role: "adult", gender: contribution.sponsorGender, })}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {contribution.sponsorName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmt.date(contribution.paidAt ?? contribution.submittedAt)}
                </p>
              </div>
              <p
                className={[
                  "shrink-0 text-sm font-semibold",
                  statusTextClass(contribution.status),
                ].join(" ")}
              >
                +{fmt.money(contribution.amountMinor)}
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
  );
}
