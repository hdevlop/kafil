import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const list = readSource("../src/hooks/useResponsiveOffsetList.ts");
const buffer = readSource("../src/hooks/useOffsetInfiniteQuery.ts");
const viewport = readSource("../src/hooks/useDesktopTableMode.ts");

describe("list row buffering", () => {
  test("the server request size is a constant, not the display page size", () => {
    // NTable measures the page size from the rendered container, so it moves as
    // the grid, the column count, and card images settle. Binding a request to
    // it puts a round trip and a second skeleton behind every correction.
    expect(list).toContain("const ROW_WINDOW_SIZE = 50;");
    expect(list).toContain("windowSize: wantsAll ? ALL_STRATEGY_LIMIT : ROW_WINDOW_SIZE");
    expect(buffer).toContain("windowSize = 50");

    // The buffer key must not carry the display page or page size, or a
    // correction would still discard the buffer and refetch.
    expect(buffer).toContain('queryKey: [...queryKey, "buffer", windowSize]');
    expect(list).not.toContain("offsetPagination");
  });

  test("a display page is a slice of the buffer", () => {
    expect(list).toContain("const start = pagination.pageIndex * pagination.pageSize;");
    expect(list).toContain("rows.slice(start, start + pagination.pageSize)");
  });

  test("every mode reads the same buffer", () => {
    expect(list).toContain("const buffer = useOffsetInfiniteQuery({");
    // One query, not one per mode.
    expect(list.match(/useOffsetInfiniteQuery\(/g)).toHaveLength(1);
    expect(list).not.toContain("useQuery(");
  });

  test("paging forward is prefetched a page ahead", () => {
    expect(list).toContain("if (rows.length >= start + pagination.pageSize * 2) return;");
    expect(list).toContain("void fetchNextPage();");
  });

  test("a background window extension is not a loading state", () => {
    // Extending the buffer must leave the rows on screen; only having nothing
    // at all is a load.
    expect(list).toContain("loading: buffer.isPending,");
    expect(list).toContain('loadingMore: mode === "infinite" && buffer.isFetchingNextPage,');
  });

  test("page count is exact within the buffer", () => {
    expect(list).toContain(
      "const bufferedPages = Math.max(1, Math.ceil(rows.length / pagination.pageSize));",
    );
    expect(list).toContain("buffer.hasNextPage ? bufferedPages + 1 : bufferedPages");
  });

  test("a cached list survives navigation because the key ignores measurement", () => {
    // The display page size is measured and moves (25, then 24, then 16). A key
    // carrying it never matches on return, so every navigation missed the cache
    // and re-ran the skeleton.
    expect(buffer).not.toContain("pageSize");
    expect(list).not.toContain("pageSize }]");
  });

  test("viewport mode is read during render, not filled in from an effect", () => {
    // A mode resolved in an effect paints one frame of the wrong viewport, so a
    // desktop table page shows the card skeleton before the table skeleton.
    expect(viewport).toContain("useSyncExternalStore");
    expect(viewport).toContain("() => window.matchMedia(query).matches");
    expect(viewport).not.toContain("useState");
    expect(viewport).not.toContain("useEffect");
  });

  test("all downgrades to infinite when it fills its ceiling", () => {
    expect(list).toContain("const ALL_STRATEGY_LIMIT = 100;");
    expect(list).toContain("const allDowngraded = wantsAll && buffer.hasNextPage;");
  });
});
