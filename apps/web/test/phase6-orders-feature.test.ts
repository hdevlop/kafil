import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { getOrderActions } from "../src/features/Orders/config/orderActions";
import {
  orderReasonFormSchema,
  toOrderReasonInput,
} from "../src/features/Orders/config/orderSchemas";
import { orderKeys } from "../src/features/Orders/hooks/orderKeys";
import { ORDER_CART_MAX_QUANTITY } from "../src/features/OrderCart/types";
import {
  useOrderCartStore,
  selectOrderCartViewModel,
} from "../src/features/OrderCart/store/orderCartStore";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

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
});

describe("Phase 7 unified OrderCart flow", () => {
  test("renders the shared OrderCartDialog with the new AssistedFamilySelector for assisted draft", async () => {
    const [dialog, familySelector, floatingButton] = await Promise.all([
      readSource(
        "../src/features/OrderCart/components/OrderCartDialog.tsx",
      ),
      readSource(
        "../src/features/OrderCart/components/AssistedFamilySelector.tsx",
      ),
      readSource(
        "../src/features/OrderCart/components/FloatingOrderCartButton.tsx",
      ),
    ]);

    expect(dialog).toContain("AssistedFamilySelector");
    expect(dialog).toContain("getProduct");
    expect(dialog).toContain("fetchQuery");
    expect(dialog).toContain("setAvailability");
    expect(dialog).toContain("unavailableItemCount");
    expect(dialog).toContain("canSaveAssisted");
    expect(dialog).toContain("getFamilyCatalogProduct");
    expect(dialog).toContain("<Image");
    expect(dialog).toContain("<NEmptyState");
    expect(dialog).not.toContain("SelectInput");
    expect(dialog).not.toContain("TextAreaInput");
    expect(dialog).not.toContain("description={itemsLabel}");
    expect(dialog.indexOf("<AssistedFamilySelector")).toBeLessThan(
      dialog.indexOf("orderCart.items.map"),
    );
    expect(dialog).not.toContain("createAssistedOrder");
    expect(dialog).not.toContain("AssistedOrderDialogContent");

    expect(familySelector).toContain("listFamilies");
    expect(familySelector).toContain("getBudgetSummary");
    expect(familySelector).toContain('status: "active"');
    expect(familySelector).toContain("ComboboxInput");
    expect(familySelector).toContain("fundingPercent");
    expect(familySelector).toContain("funding.fundedMinor");
    expect(familySelector).toContain("funding.targetMinor");
    expect(familySelector).not.toContain("FundingProgressBar");
    expect(familySelector).not.toContain("@/shared/FundingProgressCard");
    expect(familySelector).not.toContain("NCardInfo");
    expect(familySelector).not.toContain("NCardSection");
    expect(familySelector).toContain("onFundingEligibilityChange");
    expect(familySelector).not.toContain("fundingMessage");
    expect(familySelector).not.toContain("funding.openDescription");
    expect(familySelector).toContain('emptyMessage=""');
    expect(familySelector).not.toContain("TextInput");
    expect(familySelector).not.toContain("noFamilyMatch");

    expect(floatingButton).toContain("floating-order-cart-button");
  });

  test("OrderCartDialog blocks save when items are unavailable or count is zero", () => {
    const dialog = readSource(
      "../src/features/OrderCart/components/OrderCartDialog.tsx",
    );

    expect(dialog).toMatch(
      /allItemsAvailable\s*=\s*hasAnyItems\s*&&\s*unavailableItemCount\s*===\s*0/,
    );
    expect(dialog).toMatch(
      /fundingTargetReached\s*=\s*isExactFamily[\s\S]*?funding\.status\s*===\s*"active"[\s\S]*?:\s*selectedFamilyFundingEligible/,
    );
    expect(dialog).toMatch(
      /canSaveAssisted\s*=\s*showAssistedFields[\s\S]*?Boolean\(selectedFamily\)\s*&&\s*fundingTargetReached\s*&&\s*hasAnyItems\s*&&\s*allItemsAvailable[\s\S]*?:\s*fundingTargetReached\s*&&\s*allItemsAvailable/,
    );
    expect(dialog).toContain(
      "onFundingEligibilityChange={setSelectedFamilyFundingEligible}",
    );
  });

  test("OrderCartDialog revalidates every draft product without a capped list query", () => {
    const dialog = readSource(
      "../src/features/OrderCart/components/OrderCartDialog.tsx",
    );

    expect(dialog).toContain("getProduct(productId)");
    expect(dialog).toContain("productKeys.detail(productId)");
    expect(dialog).toContain('staleTime: 0');
    expect(dialog).toMatch(/status === "active"/);
    expect(dialog).not.toContain("managementCatalog");
  });

  test("OrderCart store caps quantities and exposes a safe total", () => {
    const draft = {
      "11111111-1111-4111-8111-111111111111": {
        productId: "11111111-1111-4111-8111-111111111111",
        productName: "Rice",
        sku: "RICE",
        quantity: ORDER_CART_MAX_QUANTITY,
        estimatedUnitPriceMinor: 100,
        currency: "MAD",
        available: true,
      },
    };
    const viewModel = selectOrderCartViewModel({
      draftItems: draft,
    } as never);
    expect(viewModel.distinctItemCount).toBe(1);
    expect(viewModel.totalQuantity).toBe(ORDER_CART_MAX_QUANTITY);
    expect(viewModel.estimatedTotalMinor).toBe(
      ORDER_CART_MAX_QUANTITY * 100,
    );
  });

  test("OrderCart store reset clears the draft and the bound session", () => {
    const previous = useOrderCartStore.getState();
    useOrderCartStore.setState({
      ownerUserId: "previous-user",
      mode: "assisted",
      dialogOpen: true,
      draftItems: {
        abc: {
          productId: "abc",
          productName: "x",
          sku: "x",
          quantity: 1,
          estimatedUnitPriceMinor: 100,
          currency: "MAD",
          available: true,
        },
      },
    });
    useOrderCartStore.getState().reset();
    expect(useOrderCartStore.getState().draftItems).toEqual({});
    expect(useOrderCartStore.getState().dialogOpen).toBe(false);
    useOrderCartStore.setState(previous);
  });
});
