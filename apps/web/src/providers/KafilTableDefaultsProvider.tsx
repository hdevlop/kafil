"use client";

import { useMemo } from "react";
import { NTableDefaultsProvider } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

/**
 * Localized page controls for every `NTable` in the app.
 *
 * Najm Kit ships English fallbacks for these, which is fine for the package and
 * wrong for Kafil — four locales, one of them right-to-left. Supplying them
 * here rather than at each of the two dozen table render sites means a new
 * table is localized by existing, and a missed one is not a possible bug.
 */
export function KafilTableDefaultsProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { t } = useKafilLanguage();

  // Passed straight through by the package, so it is memoized here; `t` changes
  // only when the language does.
  const defaults = useMemo(
    () => ({
      paginationLabels: {
        rowsPerPage: t("common.pagination.rowsPerPage"),
        pagination: t("common.pagination.label"),
        goToPage: (page: number) => t("common.pagination.goToPage", { page }),
        currentPage: (page: number) => t("common.pagination.currentPage", { page }),
        firstPage: t("common.pagination.firstPage"),
        previousPage: t("common.pagination.previousPage"),
        nextPage: t("common.pagination.nextPage"),
        lastPage: t("common.pagination.lastPage"),
        pageOf: (page: number, pageCount: number) =>
          t("common.pagination.pageOf", { page, pageCount }),
        rowsSelected: (selected: number, total: number) =>
          t("common.pagination.rowsSelected", { selected, total }),
      },
    }),
    [t],
  );

  return (
    <NTableDefaultsProvider value={defaults}>{children}</NTableDefaultsProvider>
  );
}
