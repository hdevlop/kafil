import type { NTableCardPagination } from "najm-kit";
import type { ResolvedListMode } from "@/hooks/useResponsiveOffsetList";
import type { TranslationKey } from "@/i18n/translations";

export interface ResponsiveListPaginationState {
  cardViewport: boolean;
  hasNextPage: boolean;
  loadingMore: boolean;
  loadMoreError: unknown;
  onLoadMore: () => unknown | Promise<unknown>;
  /**
   * Resolved by `useResponsiveOffsetList` from the list's strategy and the
   * current viewport. Absent for callers that predate the strategy option, in
   * which case the viewport alone decides.
   */
  mode?: ResolvedListMode;
}

export function createCardPagination(
  state: ResponsiveListPaginationState,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
): NTableCardPagination {
  const mode = state.mode ?? (state.cardViewport ? "infinite" : "paged");

  // Numbered pages. Najm Kit fills the container height and reports the page
  // size it wants through onPaginationChange.
  if (mode === "paged") return { mode: "paged" };

  // The whole set is already loaded; render it and show no controls.
  if (mode === "all") return { mode: "all" };

  return {
    mode: "infinite",
    hasNextPage: state.hasNextPage,
    loadingMore: state.loadingMore,
    loadMoreError: state.loadMoreError ? t("common.loadMoreError") : undefined,
    onLoadMore: state.onLoadMore,
    retryLabel: t("common.retryLoadMore"),
    loadMoreErrorLabel: t("common.loadMoreError"),
    itemsLoadedLabel: (count) => t("common.itemsLoaded", { count }),
  };
}
