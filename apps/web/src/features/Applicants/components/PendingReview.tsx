"use client";

import { NButton } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

export function PendingReview({
  destination,
}: Readonly<{ destination: string }>) {
  const { t } = useKafilLanguage();

  return (
    <div className="flex w-full flex-col text-center">
      <h1 className="text-3xl text-muted-foreground">
        {t("applicants.review.title")}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t("applicants.review.body")}
      </p>
      <p
        className="mt-5 rounded-2xl bg-muted px-5 py-4 text-sm leading-6 text-muted-foreground"
        aria-label={t("applicants.review.destinationAria")}
      >
        {t("applicants.review.destination", { destination })}
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        {t("applicants.review.nextSteps")}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <NButton
          type="button"
          variant="outline"
          onClick={() => {
            window.location.assign("/");
          }}
        >
          {t("applicants.review.backHome")}
        </NButton>
        <NButton
          type="button"
          onClick={() => {
            window.location.assign("/login");
          }}
        >
          {t("applicants.review.signIn")}
        </NButton>
      </div>
    </div>
  );
}
