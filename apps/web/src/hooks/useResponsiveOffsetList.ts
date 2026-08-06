"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { OffsetPageFetcher } from "@/lib/pagination";

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
 * The size of one server request, in rows.
 *
 * This is not the page size. NTable measures how many rows fit and reports a
 * display page size that moves — 25 on the first paint, then 24 once the grid
 * is measured, then 16 once card images decode and the cards grow. Requesting
 * that number would mean a fresh round trip per correction, and a second
 * skeleton behind each one.
 *
 * Instead every request asks for the same window and the display page is a
 * slice of what has already arrived. A correction becomes a re-slice. The
 * window is comfortably larger than the largest page any viewport produces
 * (a 4-column card grid tops out near 24), so the first request answers the
 * first page whatever the measurement turns out to be.
 */
const ROW_WINDOW_SIZE = 50;

/**
 * The server clamps `limit` to 100. `all` therefore issues exactly one request
 * and never chains windows.
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
  fetchPage: OffsetPageFetcher<T>;
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

  const wantsAll = strategy === "all";
  const wantsInfinite = strategy === "infinite" || (strategy === "paged" && cardViewport);

  // One buffer serves every mode. `all` asks for the ceiling in a single window
  // and proves its bound by there being nothing after it.
  const buffer = useOffsetInfiniteQuery({
    enabled,
    fetchPage,
    queryKey,
    windowSize: wantsAll ? ALL_STRATEGY_LIMIT : ROW_WINDOW_SIZE,
  });
  const rows = buffer.rows;

  // `all` is a hint, not a promise: filling the ceiling disproves the bound.
  const allDowngraded = wantsAll && buffer.hasNextPage;

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

  const mode: ResolvedListMode = wantsAll && !allDowngraded
    ? "all"
    : wantsInfinite || allDowngraded ? "infinite" : "paged";

  const start = pagination.pageIndex * pagination.pageSize;
  const data = mode === "paged"
    ? rows.slice(start, start + pagination.pageSize)
    : rows;

  // Extend the buffer while the reader is still on an earlier page, so moving
  // forward reads from memory instead of waiting on the network. One page of
  // lookahead is enough: a page cannot be turned faster than a window loads.
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = buffer;
  useEffect(() => {
    if (mode !== "paged") return;
    if (!hasNextPage || isFetchingNextPage) return;
    if (rows.length >= start + pagination.pageSize * 2) return;
    void fetchNextPage();
  }, [
    mode,
    hasNextPage,
    isFetchingNextPage,
    rows.length,
    start,
    pagination.pageSize,
    fetchNextPage,
  ]);

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

  // With a server total the page count is simply true. Without one, the only
  // honest claim is still "everything buffered, and one more page if the
  // buffer has not reached the end" — which understates a long result, and is
  // why the endpoints backing numbered pages report a total.
  const bufferedPages = Math.max(1, Math.ceil(rows.length / pagination.pageSize));
  const pageCount = buffer.total !== null
    ? Math.max(1, Math.ceil(buffer.total / pagination.pageSize))
    : buffer.hasNextPage ? bufferedPages + 1 : bufferedPages;

  return {
    cardViewport,
    mode,
    data,
    /** Rows matching the current filters on the server, or `null` if unknown. */
    total: buffer.total,
    error: buffer.error,
    hasNextPage: mode === "infinite" && buffer.hasNextPage,
    // A background window extension is not a load. Paged readers keep the rows
    // they are looking at; only having nothing at all is a loading state.
    loading: buffer.isPending,
    loadingMore: mode === "infinite" && buffer.isFetchingNextPage,
    loadMoreError: buffer.isFetchNextPageError ? buffer.error : null,
    onLoadMore: () => buffer.fetchNextPage(),
    onPaginationChange,
    pageCount,
    pagination: {
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
    },
    refetch: buffer.refetch,
  };
}
