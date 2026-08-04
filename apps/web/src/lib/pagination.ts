import type { QueryValue } from "@/services/http";

export interface OffsetPagination {
  limit: number;
  offset: number;
}

export interface OffsetPage<T> {
  rows: T[];
  hasNextPage: boolean;
  nextOffset: number;
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
  fetchPage: (pagination: OffsetPagination) => Promise<T[]>,
  pagination: OffsetPagination,
): Promise<OffsetPage<T>> {
  const requestedLimit = Math.min(100, Math.max(1, pagination.limit));
  const probeLimit = requestedLimit < 100 ? requestedLimit + 1 : requestedLimit;
  const fetched = await fetchPage({
    limit: probeLimit,
    offset: pagination.offset,
  });
  const rows = fetched.slice(0, requestedLimit);
  const hasNextPage = fetched.length > requestedLimit || (
    requestedLimit === 100 &&
    fetched.length === requestedLimit &&
    (await fetchPage({ limit: 1, offset: pagination.offset + requestedLimit })).length > 0
  );

  return {
    rows,
    hasNextPage,
    nextOffset: pagination.offset + rows.length,
  };
}

export async function listAllOffsetPages<T>(
  fetchPage: (pagination: OffsetPagination) => Promise<T[]>,
  pageSize = 100,
) {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchPage({ limit: pageSize, offset });
    rows.push(...page);

    if (page.length < pageSize) return rows;
    offset += pageSize;
  }
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
