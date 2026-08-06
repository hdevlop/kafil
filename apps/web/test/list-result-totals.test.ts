import { describe, expect, test } from "bun:test";

import {
  fetchOffsetPage,
  type OffsetPagination,
} from "../src/lib/pagination";

interface Row {
  id: number;
}

function rows(count: number, from = 0): Row[] {
  return Array.from({ length: count }, (_, index) => ({ id: from + index }));
}

/**
 * A list endpoint that reports a result total, as every endpoint backing a
 * numbered desktop table now does.
 */
function totalAwareEndpoint(total: number) {
  const calls: OffsetPagination[] = [];
  return {
    calls,
    fetchPage: async (pagination: OffsetPagination) => {
      calls.push(pagination);
      const available = Math.max(0, total - pagination.offset);
      return {
        rows: rows(Math.min(pagination.limit, available), pagination.offset),
        total,
      };
    },
  };
}

/** A list that has not been migrated and can only be probed. */
function arrayEndpoint(total: number) {
  const calls: OffsetPagination[] = [];
  return {
    calls,
    fetchPage: async (pagination: OffsetPagination) => {
      calls.push(pagination);
      const available = Math.max(0, total - pagination.offset);
      return rows(Math.min(pagination.limit, available), pagination.offset);
    },
  };
}

describe("offset page result totals", () => {
  test("a reported total is carried through to the page", async () => {
    const endpoint = totalAwareEndpoint(240);

    const page = await fetchOffsetPage(endpoint.fetchPage, {
      limit: 25,
      offset: 0,
    });

    expect(page.total).toBe(240);
    expect(page.rows).toHaveLength(25);
    expect(page.nextOffset).toBe(25);
  });

  test("a total decides hasNextPage without a probe row", async () => {
    const endpoint = totalAwareEndpoint(240);

    const page = await fetchOffsetPage(endpoint.fetchPage, {
      limit: 25,
      offset: 0,
    });

    expect(page.hasNextPage).toBe(true);
    // The probe row still rides along, because whether this endpoint reports a
    // total is only knowable once it has answered. What the total buys is the
    // absence of a second request — see the ceiling case below.
    expect(endpoint.calls).toHaveLength(1);
    expect(endpoint.calls[0]).toEqual({ limit: 26, offset: 0 });
  });

  test("the last page reports no next page", async () => {
    const endpoint = totalAwareEndpoint(240);

    const page = await fetchOffsetPage(endpoint.fetchPage, {
      limit: 25,
      offset: 225,
    });

    expect(page.rows).toHaveLength(15);
    expect(page.hasNextPage).toBe(false);
    expect(page.total).toBe(240);
  });

  test("a result ending exactly on a page boundary has no next page", async () => {
    const endpoint = totalAwareEndpoint(50);

    const page = await fetchOffsetPage(endpoint.fetchPage, {
      limit: 25,
      offset: 25,
    });

    expect(page.rows).toHaveLength(25);
    expect(page.hasNextPage).toBe(false);
  });

  test("a total answers the 100-row ceiling in one request", async () => {
    // The ceiling leaves no room for a probe row, so this is exactly where the
    // untotalled path has to spend a second request.
    const endpoint = totalAwareEndpoint(240);

    const page = await fetchOffsetPage(endpoint.fetchPage, {
      limit: 100,
      offset: 0,
    });

    expect(page.hasNextPage).toBe(true);
    expect(endpoint.calls).toEqual([{ limit: 100, offset: 0 }]);
  });

  test("an empty result is a total of zero, not an unknown total", async () => {
    const endpoint = totalAwareEndpoint(0);

    const page = await fetchOffsetPage(endpoint.fetchPage, {
      limit: 25,
      offset: 0,
    });

    expect(page.rows).toEqual([]);
    expect(page.hasNextPage).toBe(false);
    expect(page.total).toBe(0);
  });

  test("a list without a total still works, and says so", async () => {
    const endpoint = arrayEndpoint(240);

    const page = await fetchOffsetPage(endpoint.fetchPage, {
      limit: 25,
      offset: 0,
    });

    expect(page.rows).toHaveLength(25);
    expect(page.hasNextPage).toBe(true);
    // null, never 0 — a numbered control has nothing honest to show from this.
    expect(page.total).toBeNull();
  });

  test("a list without a total probes the 100-row ceiling with a second request", async () => {
    const endpoint = arrayEndpoint(240);

    const page = await fetchOffsetPage(endpoint.fetchPage, {
      limit: 100,
      offset: 0,
    });

    expect(page.rows).toHaveLength(100);
    expect(page.hasNextPage).toBe(true);
    expect(endpoint.calls).toEqual([
      { limit: 100, offset: 0 },
      { limit: 1, offset: 100 },
    ]);
  });
});
