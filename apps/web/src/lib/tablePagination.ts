import type { NTableCardPagination } from "najm-kit";
import type { TranslationKey } from "@/i18n/translations";

export interface ResponsiveListPaginationState {
  cardViewport: boolean;
  hasNextPage: boolean;
  loadingMore: boolean;
  loadMoreError: unknown;
  onLoadMore: () => unknown | Promise<unknown>;
}

export function createCardPagination(
  state: ResponsiveListPaginationState,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
): NTableCardPagination {
  if (!state.cardViewport) return { mode: "paged" };

  return {
    mode: "load-more",
    hasNextPage: state.hasNextPage,
    loadingMore: state.loadingMore,
    loadMoreError: state.loadMoreError ? t("common.loadMoreError") : undefined,
    onLoadMore: state.onLoadMore,
    loadMoreLabel: t("common.loadMore"),
    loadingMoreLabel: t("common.loadingMore"),
    retryLabel: t("common.retryLoadMore"),
    loadMoreErrorLabel: t("common.loadMoreError"),
    itemsLoadedLabel: (count) => t("common.itemsLoaded", { count }),
  };
}
