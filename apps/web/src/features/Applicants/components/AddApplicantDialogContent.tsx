"use client";

import { ClipboardCopy } from "lucide-react";
import { NButton, NCard, NCardSection, toast } from "najm-kit";

import { useTranslation } from "najm-i18n/react";

export function AddApplicantDialogContent() {
  const { t } = useTranslation();

  async function copyApplicationLink() {
    const applicationUrl = new URL("/apply", window.location.origin).toString();
    await navigator.clipboard.writeText(applicationUrl);
    toast.success(t("operator.applicants.linkCopied"));
  }

  return (
    <NCard bordered title={t("operator.applicants.addGuideTitle")}>
      <NCardSection className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {t("operator.applicants.addGuideDescription")}
        </p>
        <div>
          <NButton onClick={() => void copyApplicationLink()}>
            <ClipboardCopy className="size-4" />
            {t("operator.applicants.copyLink")}
          </NButton>
        </div>
      </NCardSection>
    </NCard>
  );
}
