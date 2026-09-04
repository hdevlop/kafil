"use client";

import { UserRound } from "lucide-react";
import { NCard, NErrorState, NSheet } from "najm-kit";
import { useEffect, useState } from "react";

import { useTranslation } from "najm-i18n/react";
import { getPublicApiErrorMessage } from "@/services/apiError";

import { useOwnSponsorProfile } from "../../hooks/useSponsorProfile";
import { isSponsorProfileMissing } from "../../lib/isSponsorProfileMissing";
import {
  CreateOwnSponsorProfileForm,
  UpdateOwnSponsorProfileForm,
} from "./SponsorProfileForms";

const OPEN_SPONSOR_PROFILE_EVENT = "kafil:open-sponsor-profile";

export function openSponsorProfileSheet() {
  window.dispatchEvent(new Event(OPEN_SPONSOR_PROFILE_EVENT));
}

export function SponsorProfileSheet() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const profile = useOwnSponsorProfile();
  const required = profile.isError && isSponsorProfileMissing(profile.error);

  useEffect(() => {
    const openSheet = () => setOpen(true);
    window.addEventListener(OPEN_SPONSOR_PROFILE_EVENT, openSheet);
    return () => window.removeEventListener(OPEN_SPONSOR_PROFILE_EVENT, openSheet);
  }, []);

  return (
    <NSheet
      open={open || required}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && required) return;
        setOpen(nextOpen);
      }}
      icon={UserRound}
      title={t(required ? "sponsor.profile.completeTitle" : "sponsor.profile.sheetTitle")}
      description={t(required ? "sponsor.profile.completeDescription" : "sponsor.profile.sheetDescription")}
      width={760}
    >
      {profile.isPending ? (
        <NCard
          loading
          title={t("sponsor.profile.loading")}
          description={t("sponsor.profile.sheetDescription")}
        />
      ) : profile.isError && !required ? (
        <NErrorState
          message={getPublicApiErrorMessage(profile.error, t("state.retry"))}
          title={t("sponsor.profile.loadError")}
          onRetry={() => void profile.refetch()}
          surface="panel"
        />
      ) : required ? (
        <CreateOwnSponsorProfileForm onSuccess={() => setOpen(false)} />
      ) : profile.data ? (
        <UpdateOwnSponsorProfileForm
          profile={profile.data}
          onSuccess={() => setOpen(false)}
        />
      ) : null}
    </NSheet>
  );
}
