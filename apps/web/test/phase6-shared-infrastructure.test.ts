import { describe, expect, test } from "bun:test";

import { entityKeys } from "../src/hooks/queryKeys";
import {
  formatKafilDate,
  formatKafilNumber,
  formatMad,
  formatStatusLabel,
} from "../src/lib/format";
import {
  cleanQuery,
  createOffsetPagination,
  getPageIndex,
  hasPossibleNextPage,
} from "../src/lib/pagination";
import { getStatusColor } from "../src/lib/status";
import {
  getApiErrorMessage,
  getApiErrorStatus,
  KafilApiError,
  toApiError,
} from "../src/services/apiError";
import { buildApiPath, unwrapApiResponse } from "../src/services/http";

describe("Phase 6B API infrastructure", () => {
  test("builds encoded API query strings without empty values", () => {
    expect(
      buildApiPath("/families", {
        limit: 25,
        offset: 0,
        search: "Amina family",
        status: "",
        unused: undefined,
      }),
    ).toBe("/families?limit=25&offset=0&search=Amina+family");
  });

  test("unwraps the standard Najm response envelope without changing feature data", () => {
    expect(
      unwrapApiResponse({
        data: { id: "family-1", name: "Amina family" },
        message: "Retrieved successfully",
        status: "success" as const,
      }),
    ).toEqual({ id: "family-1", name: "Amina family" });
  });

  test("normalizes Najm and response-shaped API errors", () => {
    const najmError = {
      status: 409,
      body: { code: "CONFLICT", message: "Family already exists" },
    };
    const normalized = toApiError(najmError);

    expect(normalized).toBeInstanceOf(KafilApiError);
    expect(normalized.message).toBe("Family already exists");
    expect(normalized.status).toBe(409);
    expect(normalized.code).toBe("CONFLICT");

    const responseError = {
      response: { status: 403, data: { message: "Access denied" } },
    };
    expect(getApiErrorStatus(responseError)).toBe(403);
    expect(getApiErrorMessage(responseError)).toBe("Access denied");
  });

  test("creates stable entity query keys", () => {
    expect(entityKeys.all("families")).toEqual(["families"]);
    expect(entityKeys.detail("families", "family-1")).toEqual([
      "families",
      "detail",
      "family-1",
    ]);
  });
});

describe("Phase 6B formatters and status helpers", () => {
  test("formats integer minor units as MAD", () => {
    const result = formatMad(12_345, "fr");
    expect(result).toContain("123");
    expect(result).toContain("45");
    expect(result).toContain("MAD");
    expect(formatMad(12.5)).toBe("—");
  });

  test("formats dates and numbers by Kafil language", () => {
    expect(formatKafilNumber(12_345, "en")).not.toBe("—");
    expect(formatKafilDate("2026-07-16T12:00:00Z", "en")).toContain("2026");
    expect(formatKafilDate("not-a-date", "fr")).toBe("—");
  });

  test("maps Kafil workflow statuses to Najm badge colors", () => {
    expect(getStatusColor("validated")).toBe("success");
    expect(getStatusColor("pending")).toBe("warning");
    expect(getStatusColor("rejected")).toBe("destructive");
    expect(getStatusColor("future_status")).toBe("neutral");
    expect(formatStatusLabel("in_preparation")).toBe("In Preparation");
  });
});

describe("Phase 6B pagination helpers", () => {
  test("converts table pages to bounded backend limit and offset", () => {
    expect(createOffsetPagination(2, 25)).toEqual({ limit: 25, offset: 50 });
    expect(createOffsetPagination(-2, 500)).toEqual({
      limit: 100,
      offset: 0,
    });
    expect(getPageIndex({ limit: 25, offset: 75 })).toBe(3);
  });

  test("handles offset-list continuation and filters", () => {
    expect(
      hasPossibleNextPage(25, { limit: 25, offset: 0 }),
    ).toBe(true);
    expect(
      hasPossibleNextPage(12, { limit: 25, offset: 0 }),
    ).toBe(false);
    expect(
      cleanQuery({
        limit: 25,
        offset: 0,
        status: "active",
        search: "",
        optional: null,
      }),
    ).toEqual({ limit: 25, offset: 0, status: "active" });
  });
});
