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
      "preparation",
      "cancel",
    ]);
    expect(getOrderActions("in_preparation").map((action) => action.command)).toEqual([
      "deliver",
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
});
