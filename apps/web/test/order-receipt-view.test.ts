import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";

import { auth } from "../src/najm.auth";
import { api } from "../src/services/http";
import { receiptViewPath } from "../src/services/orderApi";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const VALID_RECEIPT =
  "/api/order-evidence/receipts/serve/0f7d2c11-4a6e-4b19-9c0a-6f1d8e2b7a34.pdf";

describe("purchase receipt reference", () => {
  test("accepts only the exact managed receipt form", () => {
    for (const extension of ["pdf", "jpg", "jpeg", "png", "webp"]) {
      const reference = VALID_RECEIPT.replace(/pdf$/, extension);
      expect(receiptViewPath(reference)).toBe(reference);
    }
  });

  test("rejects absolute URLs, traversal, other kinds, and malformed references", () => {
    for (const reference of [
      `https://kafil.example${VALID_RECEIPT}`,
      "//evil.example/api/order-evidence/receipts/serve/0f7d2c11-4a6e-4b19-9c0a-6f1d8e2b7a34.pdf",
      "/api/order-evidence/receipts/serve/../../../etc/passwd",
      "/api/order-evidence/receipts/serve/0f7d2c11-4a6e-4b19-9c0a-6f1d8e2b7a34.pdf/../secret.pdf",
      "/api/order-evidence/deliveries/serve/0f7d2c11-4a6e-4b19-9c0a-6f1d8e2b7a34.pdf",
      "/api/order-evidence/maintenance/orphans",
      "/api/order-evidence/receipts/0f7d2c11-4a6e-4b19-9c0a-6f1d8e2b7a34.pdf",
      "/api/order-evidence/receipts/serve/0f7d2c11-4a6e-4b19-9c0a-6f1d8e2b7a34.svg",
      "/api/order-evidence/receipts/serve/0f7d2c11-4a6e-4b19-9c0a-6f1d8e2b7a34.pdf?token=abc",
      "/api/order-evidence/receipts/serve/not-a-uuid.pdf",
      "/api/order-evidence/receipts/serve/.pdf",
      "",
    ]) {
      expect(() => receiptViewPath(reference)).toThrow();
    }
  });
});

describe("authenticated protected-file transport", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function pdfResponse() {
    return new Response(
      new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], {
        type: "application/pdf",
      }),
      { status: 200, headers: { "content-type": "application/pdf" } },
    );
  }

  test("sends the current bearer credential and returns bytes unparsed", async () => {
    const getState = spyOn(auth.client, "getState").mockReturnValue({
      isAuthenticated: true,
      accessToken: "access-1",
    } as never);
    const calls: Array<[string, RequestInit]> = [];
    globalThis.fetch = (async (input: string, init: RequestInit) => {
      calls.push([input, init]);
      return pdfResponse();
    }) as unknown as typeof fetch;

    const file = await api.getFile(VALID_RECEIPT);

    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(VALID_RECEIPT);
    expect(calls[0][1].method).toBe("GET");
    expect(calls[0][1].cache).toBe("no-store");
    expect(calls[0][1].credentials).toBe("include");
    expect((calls[0][1].headers as Record<string, string>).authorization).toBe(
      "Bearer access-1",
    );
    expect(file.mediaType).toBe("application/pdf");
    expect((await file.blob.arrayBuffer()).byteLength).toBe(4);
    getState.mockRestore();
  });

  test("refreshes once after a first 401 and retries with the new credential", async () => {
    let token = "stale";
    const getState = spyOn(auth.client, "getState").mockImplementation(
      () => ({ isAuthenticated: true, accessToken: token }) as never,
    );
    const refresh = spyOn(auth.client, "refresh").mockImplementation(async () => {
      token = "fresh";
    });
    const sent: string[] = [];
    globalThis.fetch = (async (_input: string, init: RequestInit) => {
      sent.push((init.headers as Record<string, string>).authorization);
      return sent.length === 1
        ? new Response("{}", { status: 401 })
        : pdfResponse();
    }) as unknown as typeof fetch;

    const file = await api.getFile(VALID_RECEIPT);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sent).toEqual(["Bearer stale", "Bearer fresh"]);
    expect(file.mediaType).toBe("application/pdf");
    getState.mockRestore();
    refresh.mockRestore();
  });

  test("surfaces a final denial instead of retrying forever", async () => {
    const getState = spyOn(auth.client, "getState").mockReturnValue({
      isAuthenticated: true,
      accessToken: "access-1",
    } as never);
    const refresh = spyOn(auth.client, "refresh").mockImplementation(async () => {});
    let attempts = 0;
    globalThis.fetch = (async () => {
      attempts += 1;
      return new Response(JSON.stringify({ message: "Forbidden" }), {
        status: 403,
      });
    }) as unknown as typeof fetch;

    await expect(api.getFile(VALID_RECEIPT)).rejects.toThrow("Forbidden");
    expect(attempts).toBe(1);
    expect(refresh).not.toHaveBeenCalled();
    getState.mockRestore();
    refresh.mockRestore();
  });
});

describe("operator and admin purchase receipt section", () => {
  const details = readSource("../src/features/Orders/components/OrderDetails.tsx");
  const section = readSource(
    "../src/features/Orders/components/PurchaseReceiptSection.tsx",
  );

  test("sits between the shared Products content and the delivery content", () => {
    const operatorBranch = details.slice(
      details.indexOf("export function OrderDetails("),
    );

    expect(operatorBranch).toContain(
      "<PurchaseReceiptSection purchase={data.activePurchase} />",
    );
    expect(operatorBranch.indexOf("<OrderSummarySections")).toBeLessThan(
      operatorBranch.indexOf("<PurchaseReceiptSection"),
    );
    expect(operatorBranch.indexOf("<PurchaseReceiptSection")).toBeLessThan(
      operatorBranch.indexOf('id="order-delivery-title"'),
    );
    expect(details.match(/<PurchaseReceiptSection/g)).toHaveLength(1);
  });

  test("reads every field from the active purchase through the shared formatters", () => {
    expect(section).toContain("purchase.merchantName");
    expect(section).toContain("fmt.dateTime(purchase.purchasedAt)");
    expect(section).toContain("fmt.money(purchase.actualTotalMinor)");
    expect(section).toContain("useNajmFormat()");
    // No second order query and no recomputed total.
    expect(section).not.toContain("useOrder(");
    expect(section).not.toContain("lineTotalMinor");
    expect(section).not.toContain("reduce(");
  });

  test("falls back to the localized value for a null receipt number", () => {
    expect(section).toContain("purchase.receiptNumber ??");
    expect(section).toContain('t("operator.orders.receipt.notProvided")');
  });

  test("keeps the section present with a localized empty state when no purchase exists", () => {
    expect(section).toContain("purchase ? (");
    expect(section).toContain('t("operator.orders.receipt.emptyTitle")');
    expect(section).toContain('t("operator.orders.receipt.emptyDescription")');
  });

  test("localizes every visible string", () => {
    for (const key of [
      "title",
      "merchant",
      "purchaseDate",
      "receiptNumber",
      "actualTotal",
      "view",
      "emptyTitle",
      "emptyDescription",
      "notProvided",
      "openError",
    ]) {
      expect(section).toContain(`t("operator.orders.receipt.${key}")`);
    }
  });

  test("never exposes the receipt to family, sponsor, or delivery surfaces", () => {
    const familyBranch = details.slice(
      details.indexOf("function FamilyOrderDetails("),
      details.indexOf("export function OrderDetails("),
    );
    const sponsorBranch = details.slice(
      details.indexOf("function SponsorOrderDetails("),
      details.indexOf("export function FamilyOrderDetailsSheet("),
    );
    const deliverySheet = readSource(
      "../src/features/Dashboard/DeliveryDashboard/components/DeliveryOrderSheet.tsx",
    );

    for (const source of [familyBranch, sponsorBranch, deliverySheet]) {
      expect(source).not.toContain("<PurchaseReceiptSection");
      expect(source).not.toContain("viewOrderReceipt");
      expect(source).not.toContain("receiptStoragePath");
    }
  });

  test("opens a prepared tab rather than linking at the protected path", () => {
    expect(section).toContain('window.open("", "_blank")');
    expect(section).toContain("preview.opener = null");
    expect(section).toContain("URL.createObjectURL(file.blob)");
    expect(section).toContain("URL.revokeObjectURL(objectUrl)");
    expect(section).not.toContain("window.open(purchase.receiptStoragePath");
    expect(section).not.toContain("<a href");
    expect(section).not.toContain("access_token");
    expect(section).not.toContain("console.");
  });

  test("verifies the served type and blocks concurrent reads", () => {
    expect(section).toContain("PREVIEWABLE_RECEIPTS.has(file.mediaType)");
    expect(section).toContain("file.mediaType !== purchase.receiptMediaType");
    expect(section).toContain("if (!purchase || pending) return;");
    expect(section).toContain("disabled={pending}");
    expect(section).toContain("loading={pending}");
  });
});
