import type { ApiPage, QueryValue } from "@/services/http";

export interface OffsetPagination {
  limit: number;
  offset: number;
}

export interface OffsetPage<T> {
  rows: T[];
  hasNextPage: boolean;
  nextOffset: number;
  /** How many rows match in total, or `null` if the endpoint does not say. */
  total: number | null;
}

/**
 * A page fetcher. Endpoints that report a result total return an `ApiPage`;
 * the bare array is what a list that has not been migrated still returns.
 */
export type OffsetPageFetcher<T> = (
  pagination: OffsetPagination,
) => Promise<ApiPage<T> | T[]>;

function toApiPage<T>(result: ApiPage<T> | T[]): ApiPage<T> {
  return Array.isArray(result) ? { rows: result, total: null } : result;
}

export const DEFAULT_PAGE_SIZE = 25;

export function createOffsetPagination(
  pageIndex = 0,
  pageSize = DEFAULT_PAGE_SIZE,
): OffsetPagination {
  const safePageIndex = Math.max(0, Math.trunc(pageIndex));
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));

  return {
    limit: safePageSize,
    offset: safePageIndex * safePageSize,
  };
}

export function getPageIndex({ limit, offset }: OffsetPagination) {
  return Math.floor(Math.max(0, offset) / Math.max(1, limit));
}

export function hasPossibleNextPage(
  receivedRows: number,
  { limit }: OffsetPagination,
) {
  return receivedRows === limit;
}

export async function fetchOffsetPage<T>(
  fetchPage: OffsetPageFetcher<T>,
  pagination: OffsetPagination,
): Promise<OffsetPage<T>> {
  const requestedLimit = Math.min(100, Math.max(1, pagination.limit));

  // Whether this endpoint reports a total is only knowable from its response,
  // so the first request still carries the probe row that the untotalled path
  // needs. What a total saves is the *second* request: at the 100-row ceiling
  // there is no room for a probe row, and continuation would otherwise need a
  // separate lookahead call.
  const probeLimit = requestedLimit < 100 ? requestedLimit + 1 : requestedLimit;
  const probed = await fetchPage({
    limit: probeLimit,
    offset: pagination.offset,
  });
  const page = toApiPage(probed);

  if (page.total !== null) {
    const rows = page.rows.slice(0, requestedLimit);
    return {
      rows,
      hasNextPage: pagination.offset + rows.length < page.total,
      nextOffset: pagination.offset + rows.length,
      total: page.total,
    };
  }

  const rows = page.rows.slice(0, requestedLimit);
  const hasNextPage = page.rows.length > requestedLimit || (
    requestedLimit === 100 &&
    page.rows.length === requestedLimit &&
    toApiPage(
      await fetchPage({ limit: 1, offset: pagination.offset + requestedLimit }),
    ).rows.length > 0
  );

  return {
    rows,
    hasNextPage,
    nextOffset: pagination.offset + rows.length,
    total: null,
  };
}

export function cleanQuery(
  query: Record<string, QueryValue>,
): Record<string, QueryValue> {
  return Object.fromEntries(
    Object.entries(query).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}
