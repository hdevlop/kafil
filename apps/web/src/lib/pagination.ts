import type { QueryValue } from "@/services/http";

export interface OffsetPagination {
  limit: number;
  offset: number;
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

export function cleanQuery(
  query: Record<string, QueryValue>,
): Record<string, QueryValue> {
  return Object.fromEntries(
    Object.entries(query).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}
