"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createOffsetPagination,
  fetchOffsetPage,
  type OffsetPagination,
} from "@/lib/pagination";

import { useCardViewport } from "./useDesktopTableMode";
import { useOffsetInfiniteQuery } from "./useOffsetInfiniteQuery";

/**
 * How a list continues.
 *
 * - `paged` — numbered pages on desktop, scroll continuation on card viewports.
 * - `infinite` — scroll continuation everywhere.
 * - `all` — one request for the whole set, no controls at all. Only valid for a
 *   list with a proven bound; see the downgrade below.
 */
export type ListStrategy = "all" | "infinite" | "paged";

/** The presentation mode resolved for the current viewport and strategy. */
export type ResolvedListMode = "all" | "infinite" | "paged";

/**
 * The server clamps `limit` to 100. `all` therefore issues exactly one request
 * and never chains pages.
 */
const ALL_STRATEGY_LIMIT = 100;

interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

interface InternalPaginationState extends PaginationState {
  queryIdentity: string;
}

type PaginationUpdater =
  | PaginationState
  | ((current: PaginationState) => PaginationState);

export function useResponsiveOffsetList<T>({
  enabled = true,
  fetchPage,
  pageSize = 25,
  queryKey,
  strategy = "paged",
}: {
  enabled?: boolean;
  fetchPage: (pagination: OffsetPagination) => Promise<T[]>;
  pageSize?: number;
  queryKey: readonly unknown[];
  strategy?: ListStrategy;
}) {
  const cardViewport = useCardViewport();
  const queryIdentity = JSON.stringify(queryKey);
  const [paginationState, setPagination] = useState<InternalPaginationState>({
    pageIndex: 0,
    pageSize,
    queryIdentity,
  });
  const pagination = paginationState.queryIdentity === queryIdentity
    ? paginationState
    : { ...paginationState, pageIndex: 0, queryIdentity };
  const offsetPagination = createOffsetPagination(
    pagination.pageIndex,
    pagination.pageSize,
  );

  const wantsAll = strategy === "all";
  const wantsInfinite = strategy === "infinite" || (strategy === "paged" && cardViewport);

  // `all` is a hint, not a promise: it asks for the ceiling in one request and
  // proves the bound by the response being short of it.
  const whole = useQuery({
    enabled: enabled && wantsAll,
    queryKey: [...queryKey, "whole"],
    queryFn: () => fetchPage({ limit: ALL_STRATEGY_LIMIT, offset: 0 }),
  });
  const ceilingReached = (whole.data?.length ?? 0) >= ALL_STRATEGY_LIMIT;
  const allDowngraded = wantsAll && ceilingReached;

  const warnedRef = useRef(false);
  useEffect(() => {
    if (!allDowngraded || warnedRef.current) return;
    warnedRef.current = true;
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[kafil] List ${queryIdentity} requested strategy "all" but filled the `
        + `${ALL_STRATEGY_LIMIT}-row ceiling, so its bound is not real. `
        + "Falling back to infinite continuation; give this list a paged or "
        + "infinite strategy.",
      );
    }
  }, [allDowngraded, queryIdentity]);

  const usesInfinite = wantsInfinite || allDowngraded;
  const usesPaged = !wantsAll && !wantsInfinite;

  const page = useQuery({
    enabled: enabled && usesPaged,
    queryKey: [...queryKey, "page", offsetPagination],
    queryFn: () => fetchOffsetPage(fetchPage, offsetPagination),
  });
  const incremental = useOffsetInfiniteQuery({
    enabled: enabled && usesInfinite,
    fetchPage,
    pageSize,
    queryKey,
  });

  const onPaginationChange = useCallback(
    (updater: PaginationUpdater) => {
      setPagination((current) => ({
          ...(typeof updater === "function" ? updater(
            current.queryIdentity === queryIdentity
              ? { pageIndex: current.pageIndex, pageSize: current.pageSize }
              : { pageIndex: 0, pageSize: current.pageSize },
          ) : updater),
          queryIdentity,
        }));
    },
    [queryIdentity],
  );

  const mode: ResolvedListMode = wantsAll && !allDowngraded
    ? "all"
    : usesInfinite ? "infinite" : "paged";

  // Without a server total the only honest claim is "one more page exists".
  const pageCount = pagination.pageIndex + (page.data?.hasNextPage ? 2 : 1);

  const data = mode === "all"
    ? (whole.data ?? [])
    : mode === "infinite" ? incremental.rows : (page.data?.rows ?? []);

  return {
    cardViewport,
    mode,
    data,
    error: mode === "all"
      ? whole.error
      : mode === "infinite" ? incremental.error : page.error,
    hasNextPage: mode === "infinite" && incremental.hasNextPage,
    loading: mode === "all"
      ? whole.isPending
      : mode === "infinite" ? incremental.isPending : page.isPending,
    loadingMore: incremental.isFetchingNextPage,
    loadMoreError: incremental.isFetchNextPageError ? incremental.error : null,
    onLoadMore: () => incremental.fetchNextPage(),
    onPaginationChange,
    pageCount,
    pagination: {
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
    },
    refetch: mode === "all"
      ? whole.refetch
      : mode === "infinite" ? incremental.refetch : page.refetch,
  };
}
