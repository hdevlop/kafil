"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import {
  fetchOffsetPage,
  type OffsetPage,
  type OffsetPageFetcher,
} from "@/lib/pagination";

/**
 * An accumulating row buffer.
 *
 * `windowSize` is the size of a *server request*, not of a displayed page. It
 * is deliberately decoupled: the display page size is measured from the
 * rendered container and changes as the viewport, column count, and card
 * height settle, and tying a request to it would put a network round trip
 * behind every measurement correction.
 */
export function useOffsetInfiniteQuery<T>({
  enabled = true,
  fetchPage,
  queryKey,
  windowSize = 50,
}: {
  enabled?: boolean;
  fetchPage: OffsetPageFetcher<T>;
  queryKey: readonly unknown[];
  windowSize?: number;
}) {
  const query = useInfiniteQuery<OffsetPage<T>, Error>({
    enabled,
    initialPageParam: 0,
    queryKey: [...queryKey, "buffer", windowSize],
    queryFn: ({ pageParam }) => fetchOffsetPage(fetchPage, {
      limit: windowSize,
      offset: Number(pageParam),
    }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.nextOffset : undefined,
  });

  const pages = query.data?.pages;

  return {
    ...query,
    rows: pages?.flatMap((page) => page.rows) ?? [],
    hasNextPage: Boolean(query.hasNextPage),
    // The newest window carries the freshest count. Reading the first page
    // instead would keep reporting a total from before the latest mutation.
    total: pages?.[pages.length - 1]?.total ?? null,
  };
}
