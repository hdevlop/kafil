"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  createOwnSponsorProfile,
  getOwnSponsorProfile,
  updateOwnSponsorProfile,
} from "@/services/sponsorProfileApi";

import { sponsorProfileKeys } from "./sponsorProfileKeys";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

export function useOwnSponsorProfile() {
  return useEntityQuery({
    queryKey: sponsorProfileKeys.profile,
    queryFn: getOwnSponsorProfile,
  });
}

export function useOwnSponsorProfileCommands() {
  const { t } = useKafilLanguage();
  const invalidate = [sponsorProfileKeys.all];

  const create = useEntityCommand({
    mutationFn: createOwnSponsorProfile,
    invalidate,
    successMessage: t("operator.sponsors.updateSuccess"),
    errorMessage: t("sponsor.profile.loadError"),
  });

  const update = useEntityCommand({
    mutationFn: updateOwnSponsorProfile,
    invalidate,
    successMessage: t("operator.sponsors.updateSuccess"),
    errorMessage: t("operator.sponsors.updateError"),
  });

  return { create, update };
}
