import { describe, expect, test } from "bun:test";

import { entityKeys } from "../src/hooks/queryKeys";
import {
  cleanQuery,
  createOffsetPagination,
  fetchOffsetPage,
  getPageIndex,
} from "najm-kit/pagination";
import { formatCurrency, formatDate, formatNumber } from "najm-kit/format";
import { resolveStatusColor } from "najm-kit";
import { formatStatusLabel } from "../src/features/StatusLabels";
import {
  KAFIL_CURRENCY,
  KAFIL_DEFAULT_TIME_ZONE,
  localeForKafilLanguage,
  type KafilLanguage,
} from "../src/preferences";
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

// Mirrors what NajmAppProvider builds from KAFIL_LOCALES + KAFIL_CURRENCY.
const configFor = (language: KafilLanguage) => ({
  locale: localeForKafilLanguage(language),
  timeZone: KAFIL_DEFAULT_TIME_ZONE,
  currency: KAFIL_CURRENCY,
});

describe("Phase 6B formatters and status helpers", () => {
  test("formats integer minor units as MAD", () => {
    const frConfig = configFor("fr");
    const enConfig = configFor("en");
    const result = formatCurrency(12_345, frConfig);
    expect(result).toContain("123");
    expect(result).toContain("45");
    expect(result).toContain("MAD");
    expect(formatCurrency(12.5, enConfig)).toBe("—");
  });

  test("formats dates and numbers by Kafil language", () => {
    const enConfig = configFor("en");
    const frConfig = configFor("fr");
    expect(formatNumber(12_345, enConfig)).not.toBe("—");
    expect(formatDate("2026-07-16T12:00:00Z", enConfig)).toContain("2026");
    expect(formatDate("not-a-date", frConfig)).toBe("—");
  });

  // The map now ships in najm-kit; this guards Kafil's vocabulary against a
  // kit-side regression.
  test("maps Kafil workflow statuses to Najm badge colors", () => {
    expect(resolveStatusColor("validated")).toBe("success");
    expect(resolveStatusColor("pending")).toBe("warning");
    expect(resolveStatusColor("pending_email_verification")).toBe("warning");
    expect(resolveStatusColor("pending_review")).toBe("warning");
    expect(resolveStatusColor("in_preparation")).toBe("warning");
    expect(resolveStatusColor("out_for_delivery")).toBe("warning");
    expect(resolveStatusColor("purchased")).toBe("info");
    expect(resolveStatusColor("rejected")).toBe("destructive");
    expect(resolveStatusColor("refunded")).toBe("destructive");
    expect(resolveStatusColor("expired")).toBe("destructive");
    expect(resolveStatusColor("stopped")).toBe("neutral");
    expect(resolveStatusColor("future_status")).toBe("neutral");
    expect(formatStatusLabel("in_preparation", "en")).toBe("Purchasing and preparation");
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

  // `hasPossibleNextPage` was dropped with the move to najm-kit: it was unused
  // outside this test, and its "received === limit means there may be more"
  // rule is what `fetchOffsetPage` applies internally — covered directly by the
  // kit's own offset-pagination tests, and by the lookahead test below.
  test("handles offset-list filters", () => {
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

  test("uses one-row lookahead at every page boundary", async () => {
    for (const size of [0, 1, 24, 25, 26, 61]) {
      const records = Array.from({ length: size }, (_, index) => index + 1);
      const page = await fetchOffsetPage(
        ({ limit, offset }) => Promise.resolve(records.slice(offset, offset + limit)),
        { limit: 25, offset: 0 },
      );
      expect(page.rows).toEqual(records.slice(0, 25));
      expect(page.hasNextPage).toBe(size > 25);
    }

    const exactMaximum = Array.from({ length: 101 }, (_, index) => index + 1);
    const page = await fetchOffsetPage(
      ({ limit, offset }) => Promise.resolve(exactMaximum.slice(offset, offset + limit)),
      { limit: 100, offset: 0 },
    );
    expect(page.rows).toHaveLength(100);
    expect(page.hasNextPage).toBe(true);
  });
});
