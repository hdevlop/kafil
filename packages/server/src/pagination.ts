import { paginated } from "najm-core";

/**
 * Wrap one page of a list result with the total the caller needs to render
 * numbered page controls.
 *
 * Callers work in `limit`/`offset` because that is what the list DTOs accept;
 * `paginated` reports a 1-based `page`, so the conversion lives here rather
 * than being rewritten — and mis-rounded — in every list service.
 *
 * The response body stays `{ data, pagination, status }`, so a frontend reader
 * that only unwraps `data` is unaffected by a list adopting this.
 */
export function listPage<T>(
  rows: T[],
  { limit, offset, total }: { limit: number; offset: number; total: number },
) {
  const safeLimit = Math.max(1, limit);
  return paginated(rows, {
    page: Math.floor(Math.max(0, offset) / safeLimit) + 1,
    limit: safeLimit,
    total,
  });
}
