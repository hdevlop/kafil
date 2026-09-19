"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { NButton, NCard, NDetailList, NEmptyState, useNajmFormat } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { viewOrderReceipt } from "@/services/orderApi";
import type { OrderPurchase } from "../types";

/** The only content types the protected evidence store records and serves. */
const PREVIEWABLE_RECEIPTS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Long enough for the opened tab to load the bytes, short enough that a page
 * left open all afternoon is not holding a receipt in memory.
 */
const OBJECT_URL_LIFETIME_MS = 60_000;

/**
 * The active purchase and its protected receipt, for Operator and Admin only.
 *
 * The receipt is fetched with the bearer credential and previewed from an
 * in-memory object URL: a plain anchor to `receiptStoragePath` would drop the
 * credential, and a token in the URL would leak it. The backend guard on
 * `GET /order-evidence/receipts/serve/:fileName` stays authoritative.
 */
export function PurchaseReceiptSection({
  purchase,
}: Readonly<{ purchase: OrderPurchase | null }>) {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openReceipt() {
    if (!purchase || pending) return;

    // Opened first and synchronously: after the await the gesture has expired
    // and the popup is blocked. `opener` is severed immediately, which is the
    // `noopener` guarantee without giving up the handle needed to navigate it.
    const preview = window.open("", "_blank");
    if (preview) preview.opener = null;

    setPending(true);
    setError(null);
    try {
      const file = await viewOrderReceipt(purchase.receiptStoragePath);
      if (
        !PREVIEWABLE_RECEIPTS.has(file.mediaType) ||
        file.mediaType !== purchase.receiptMediaType
      ) {
        throw new Error("Unsupported receipt content.");
      }
      if (!preview || preview.closed) throw new Error("Preview unavailable.");

      const objectUrl = URL.createObjectURL(file.blob);
      preview.location.href = objectUrl;
      // Revoked on a timer rather than immediately: the tab has not finished
      // reading the blob when this handler returns.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_LIFETIME_MS);
    } catch {
      preview?.close();
      setError(t("operator.orders.receipt.openError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="order-receipt-title"
      className="flex flex-col gap-2 border-b border-border pb-5"
    >
      <div className="flex items-center gap-2">
        <Receipt aria-hidden className="size-4 text-primary" />
        <h3 id="order-receipt-title" className="text-sm font-semibold">
          {t("operator.orders.receipt.title")}
        </h3>
      </div>
      {purchase ? (
        <NCard embedded>
          <NDetailList
            items={[
              {
                label: t("operator.orders.receipt.merchant"),
                value: purchase.merchantName,
              },
              {
                label: t("operator.orders.receipt.purchaseDate"),
                value: fmt.dateTime(purchase.purchasedAt),
              },
              {
                label: t("operator.orders.receipt.receiptNumber"),
                value:
                  purchase.receiptNumber ??
                  t("operator.orders.receipt.notProvided"),
              },
              {
                label: t("operator.orders.receipt.actualTotal"),
                value: fmt.money(purchase.actualTotalMinor),
              },
            ]}
          />
          <NButton
            className="mt-3"
            disabled={pending}
            fullWidth
            leftIcon={Receipt}
            loading={pending}
            onClick={openReceipt}
            type="button"
            variant="outline"
          >
            {t("operator.orders.receipt.view")}
          </NButton>
          {error ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </NCard>
      ) : (
        <NCard embedded>
          <NEmptyState
            className="min-h-0 py-4"
            description={t("operator.orders.receipt.emptyDescription")}
            icon={Receipt}
            title={t("operator.orders.receipt.emptyTitle")}
          />
        </NCard>
      )}
    </section>
  );
}
