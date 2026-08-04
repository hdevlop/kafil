"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import {
  fetchOffsetPage,
  type OffsetPage,
  type OffsetPagination,
} from "@/lib/pagination";

export function useOffsetInfiniteQuery<T>({
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
  const query = useInfiniteQuery<OffsetPage<T>, Error>({
    enabled,
    initialPageParam: 0,
    queryKey: [...queryKey, "incremental"],
    queryFn: ({ pageParam }) => fetchOffsetPage(fetchPage, {
      limit: pageSize,
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
