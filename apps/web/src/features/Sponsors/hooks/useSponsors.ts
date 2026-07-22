"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { OffsetPagination } from "@/lib/pagination";
import {
  createSponsor,
  deactivateSponsor,
  deleteSponsor,
  listSponsors,
  reactivateSponsor,
  updateSponsor,
} from "@/services/sponsorApi";

import { sponsorKeys } from "./sponsorKeys";

export function useSponsors(pagination: OffsetPagination) {
  return useEntityQuery({
    queryKey: sponsorKeys.list(pagination),
    queryFn: () => listSponsors(pagination),
  });
}

export function useSponsorCommands() {
  const { t } = useKafilLanguage();
  const invalidate = [sponsorKeys.all];

  const create = useEntityCommand({
    mutationFn: createSponsor,
    invalidate,
    successMessage: t("operator.sponsors.createSuccess"),
    errorMessage: t("operator.sponsors.createError"),
  });

  const update = useEntityCommand({
    mutationFn: updateSponsor,
    invalidate,
    successMessage: t("operator.sponsors.updateSuccess"),
    errorMessage: t("operator.sponsors.updateError"),
  });

  const remove = useEntityCommand({
    mutationFn: deleteSponsor,
    invalidate,
    successMessage: t("operator.sponsors.deleteSuccess"),
    errorMessage: t("operator.sponsors.deleteError"),
  });

  const deactivate = useEntityCommand({
    mutationFn: deactivateSponsor,
    invalidate,
    successMessage: t("operator.sponsors.deactivateSuccess"),
    errorMessage: t("operator.sponsors.deactivateError"),
  });

  const reactivate = useEntityCommand({
    mutationFn: reactivateSponsor,
    invalidate,
    successMessage: t("operator.sponsors.reactivateSuccess"),
    errorMessage: t("operator.sponsors.reactivateError"),
  });

  return { create, update, remove, deactivate, reactivate };
}
