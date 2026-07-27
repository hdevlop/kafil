import { describe, expect, test } from "bun:test";

import { getOrderActions } from "../src/features/Orders/config/orderActions";
import {
  orderReasonFormSchema,
  toOrderReasonInput,
} from "../src/features/Orders/config/orderSchemas";
import { orderKeys } from "../src/features/Orders/hooks/orderKeys";

describe("Phase 6D order command contracts", () => {
  test("only exposes valid explicit fulfillment actions for each active state", () => {
    expect(getOrderActions("pending").map((action) => action.command)).toEqual([
      "approve",
      "reject",
      "cancel",
    ]);
    expect(getOrderActions("approved").map((action) => action.command)).toEqual([
      "purchase",
      "cancel",
    ]);
    expect(getOrderActions("in_preparation").map((action) => action.command)).toEqual([
      "deliver",
      "cancel",
    ]);
    expect(getOrderActions("purchased").map((action) => action.command)).toEqual([
      "startDelivery",
      "replacePurchase",
      "cancel",
    ]);
    expect(getOrderActions("out_for_delivery").map((action) => action.command)).toEqual([
      "confirmDelivery",
      "cancel",
    ]);
    expect(getOrderActions("delivered")).toEqual([]);
  });

  test("requires and normalizes an audited reason for reject and cancel commands", () => {
    expect(orderReasonFormSchema.safeParse({ reason: "  " }).success).toBe(false);
    const values = orderReasonFormSchema.parse({ reason: "  Address is unreachable  " });

    expect(toOrderReasonInput("order-1", values)).toEqual({
      id: "order-1",
      reason: "Address is unreachable",
    });
  });

  test("keeps stable order list and detail query keys", () => {
    expect(orderKeys.list({ limit: 25, offset: 50 })).toEqual([
      "orders",
      "list",
      { limit: 25, offset: 50 },
    ]);
    expect(orderKeys.detail("order-1")).toEqual(["orders", "detail", "order-1"]);
  });

  test("ships assisted ordering, protected receipt, and delivery workflow forms", async () => {
    const [forms, operatorPage, familyPage, sponsorPage] = await Promise.all([
      Bun.file(
        new URL(
          "../src/features/Orders/components/OrderWorkflowForms.tsx",
          import.meta.url,
        ),
      ).text(),
      Bun.file(
        new URL(
          "../src/features/Orders/components/OrdersPage.tsx",
          import.meta.url,
        ),
      ).text(),
      Bun.file(
        new URL(
          "../src/features/FamilyOrdering/components/FamilyOrdersPage.tsx",
          import.meta.url,
        ),
      ).text(),
      Bun.file(
        new URL(
          "../src/features/SponsorWorkspace/components/SponsorOrdersPage.tsx",
          import.meta.url,
        ),
      ).text(),
    ]);

    expect(forms).toContain("AssistedOrderDialogContent");
    expect(forms).toContain("PurchaseOrderDialogContent");
    expect(forms).toContain("ConfirmDeliveryDialogContent");
    expect(operatorPage).toContain("Create assisted order");
    expect(familyPage).toContain("receiptRecorded");
    expect(sponsorPage).toContain("deliveryProofRecorded");
    expect(familyPage).not.toContain("assistanceNote");
    expect(sponsorPage).not.toContain("deliveryProofStoragePath");
  });
});
