"use client";

import {
  useQuery,
  type DefinedUseQueryResult,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

export type EntityQueryOptions<TData> = Omit<
  UseQueryOptions<TData, Error, TData, QueryKey>,
  "queryKey"
> & {
  queryKey: QueryKey;
};

/** Seeded from the server: `data` is never `undefined`, so callers stop guarding it. */
export function useEntityQuery<TData>(
  options: EntityQueryOptions<TData> & { initialData: TData | (() => TData) },
): DefinedUseQueryResult<TData, Error>;
export function useEntityQuery<TData>(
  options: EntityQueryOptions<TData>,
): UseQueryResult<TData, Error>;
export function useEntityQuery<TData>(options: EntityQueryOptions<TData>) {
  return useQuery(options);
}
