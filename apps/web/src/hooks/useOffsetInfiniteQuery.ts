"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import {
  fetchOffsetPage,
  type OffsetPage,
  type OffsetPagination,
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
  fetchPage: (pagination: OffsetPagination) => Promise<T[]>;
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

  return {
    ...query,
    rows: query.data?.pages.flatMap((page) => page.rows) ?? [],
    hasNextPage: Boolean(query.hasNextPage),
  };
}
