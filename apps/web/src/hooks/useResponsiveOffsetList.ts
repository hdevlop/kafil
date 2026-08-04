"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  createOffsetPagination,
  fetchOffsetPage,
  type OffsetPagination,
} from "@/lib/pagination";

import { useCardViewport } from "./useDesktopTableMode";
import { useOffsetInfiniteQuery } from "./useOffsetInfiniteQuery";

interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

type PaginationUpdater =
  | PaginationState
  | ((current: PaginationState) => PaginationState);

export function useResponsiveOffsetList<T>({
  enabled = true,
  fetchPage,
  pageSize = 25,
  queryKey,
}: {
  enabled?: boolean;
  fetchPage: (pagination: OffsetPagination) => Promise<T[]>;
  pageSize?: number;
  queryKey: readonly unknown[];
}) {
  const cardViewport = useCardViewport();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const offsetPagination = createOffsetPagination(
    pagination.pageIndex,
    pagination.pageSize,
  );
  const page = useQuery({
    enabled: enabled && !cardViewport,
    queryKey: [...queryKey, "page", offsetPagination],
    queryFn: () => fetchOffsetPage(fetchPage, offsetPagination),
  });
  const incremental = useOffsetInfiniteQuery({
    enabled: enabled && cardViewport,
    fetchPage,
    pageSize,
    queryKey,
  });
  const onPaginationChange = useCallback(
    (updater: PaginationUpdater) => {
      setPagination((current) =>
        typeof updater === "function" ? updater(current) : updater,
      );
    },
    [],
  );
  const pageCount = pagination.pageIndex + (page.data?.hasNextPage ? 2 : 1);

  return {
    cardViewport,
    data: cardViewport ? incremental.rows : (page.data?.rows ?? []),
    error: cardViewport ? incremental.error : page.error,
    hasNextPage: cardViewport && incremental.hasNextPage,
    loading: cardViewport ? incremental.isPending : page.isPending,
    loadingMore: incremental.isFetchingNextPage,
    loadMoreError: incremental.isFetchNextPageError ? incremental.error : null,
    onLoadMore: () => incremental.fetchNextPage(),
    onPaginationChange,
    pageCount,
    pagination,
    refetch: cardViewport ? incremental.refetch : page.refetch,
  };
}
