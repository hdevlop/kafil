"use client";

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";

type EntityQueryOptions<TData> = Omit<
  UseQueryOptions<TData, Error, TData, QueryKey>,
  "queryKey"
> & {
  queryKey: QueryKey;
};

export function useEntityQuery<TData>(options: EntityQueryOptions<TData>) {
  return useQuery(options);
}
