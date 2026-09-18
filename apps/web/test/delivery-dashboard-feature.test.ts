import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { getDashboardNavigation } from "../src/shared/DashboardShell/navigation";
import { dashboardKeys } from "../src/features/Dashboard/shared/dashboardKeys";

describe("delivery dashboard source contracts", () => {
  test("gives every account role one dashboard navigation entry", () => {
    expect(getDashboardNavigation("operator").map((item) => item.href)).toContain("/dashboard");
    expect(getDashboardNavigation("delivery").map((item) => item.href)).toEqual(["/dashboard", "/family"]);
    expect(getDashboardNavigation("admin").map((item) => item.href)).not.toContain("/delivery");
    expect(getDashboardNavigation("operator").map((item) => item.href)).not.toContain("/delivery");
  });

  test("keys every selected date independently", () => {
    expect(dashboardKeys.delivery("2026-09-09")).toEqual(["dashboard", "delivery", "2026-09-09"]);
    expect(dashboardKeys.delivery("2026-09-10")).not.toEqual(dashboardKeys.delivery("2026-09-09"));
  });

  test("keeps the map browser-only and free of tracking or route drawing", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const map = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryMap.tsx", "utf8");
    expect(page).toContain("ssr: false");
    expect(map).toContain("L.marker");
    expect(map).not.toContain("polyline");
    expect(map).not.toContain("watchPosition");
    expect(map).not.toContain("geolocation");
  });

  test("keeps the Casablanca map mounted when a selected date has no mapped deliveries", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const map = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryMap.tsx", "utf8");
    expect(page).toContain("<DeliveryMap");
    expect(page).not.toContain('items.some((item) => item.coordinates) ? <DeliveryMap');
    expect(map).toContain('if (points.length > 0)');
    expect(map).toContain('map.setView(CASABLANCA, 12)');
    expect(map).not.toContain('role="status"');
    expect(page).not.toContain('emptyTitle={t("dashboard.delivery.noMapLocations")}');
  });

  test("keeps delivery date state off the URL and exposes only the Today preset", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");

    expect(page).not.toContain("useSearchParams");
    expect(page).not.toContain("useRouter");
    expect(page).not.toContain("tomorrowDate");
    expect(page).not.toContain("dashboard.delivery.tomorrow");
    expect(page).toContain('const [date, setDate] = useState(() => casablancaToday())');
    expect(page).toContain('from "../../shared/deliveryTime"');
    expect(page).not.toContain("function casablancaDate");
    expect(page).not.toContain("function minuteLabel");
    expect(page).toContain('currentUrl.searchParams.delete("date")');
  });

  test("reuses shared attention, quick-action, and dashboard skeleton components", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const adminAttention = readFileSync("src/features/Dashboard/AdminDashboard/components/AttentionCard.tsx", "utf8");
    const adminActions = readFileSync("src/features/Dashboard/AdminDashboard/components/QuickActionsCard.tsx", "utf8");
    const sponsorActions = readFileSync("src/features/Dashboard/SponsorDashboard/components/SponsorQuickActionsCard.tsx", "utf8");
    const skeletons = readFileSync("src/features/Dashboard/shared/DashboardSkeletons.tsx", "utf8");

    expect(page).toContain("<DashboardAttentionCard");
    expect(page).toContain("<DashboardQuickActionsCard");
    expect(page).toContain("<DeliveryDashboardSkeleton");
    expect(adminAttention).toContain("<DashboardAttentionCard");
    expect(adminActions).toContain("<DashboardQuickActionsCard");
    expect(sponsorActions).toContain("<DashboardQuickActionsCard");
    expect(skeletons).toContain("export function DeliveryDashboardSkeleton");
  });

  test("does not present the selected delivery as an attention item", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const attentionCard = page.slice(
      page.indexOf("<DashboardAttentionCard"),
      page.indexOf("<DashboardQuickActionsCard"),
    );

    expect(attentionCard).not.toContain("selected.familyName");
    expect(attentionCard).not.toContain("selected.category");
  });

  test("puts Today and the date picker in the map card header at equal height", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");

    expect(page).toContain("<NCardAction>");
    expect(page).toContain('className="h-10 px-3"');
    expect(page).toContain('<DateInput');
    expect(page).toContain('className="w-32 sm:w-48"');
  });

  test("puts the map first and leaves nothing layered over its markers", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const header = page.indexOf("<NPageHeader");
    const map = page.indexOf("<DeliveryMap");

    expect(header).toBeGreaterThan(-1);
    expect(map).toBeGreaterThan(header);
    for (const laterSection of [
      "<NStatCard",
      "<NPieChart",
      "<DashboardAttentionCard",
      "<DashboardQuickActionsCard",
      'id="delivery-list"',
    ]) {
      expect(page.indexOf(laterSection)).toBeGreaterThan(map);
    }

    // The permanent in-map detail overlay is gone.
    expect(page).not.toContain("absolute inset-x-3 bottom-3");
    expect(page).not.toContain("backdrop-blur");
    expect(page).not.toContain("z-[500]");
  });

  test("opens one shared right sheet from both a marker and a planned-delivery row", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const sheet = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryOrderSheet.tsx", "utf8");

    expect(page).toContain("<DeliveryOrderSheet");
    expect(page.match(/<DeliveryOrderSheet/g)).toHaveLength(1);
    expect(page).toContain("openAttempt(item.attemptId, event.currentTarget)");
    expect(page).toContain("onSelect={selectFromMap}");
    // A row and a marker set the same selection state.
    expect(page.match(/setSelectedId\(attemptId\)/g)).toHaveLength(2);

    // Najm's installed sheet primitive, right side in every locale, sticky footer.
    expect(sheet).toContain("<NSheet");
    expect(sheet).toContain('side="right"');
    expect(sheet).not.toContain('language === "ar" ? "left"');
    expect(sheet).toContain("width={480}");
    expect(sheet).toContain("max-w-full");
    expect(sheet).toContain("footer={");
    expect(sheet).toContain("DeliverySheetFooter");
  });

  test("reuses the shared order summary and purchase form instead of copying them", () => {
    const sheet = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryOrderSheet.tsx", "utf8");
    const summary = readFileSync("src/features/Orders/components/OrderSummarySections.tsx", "utf8");
    const details = readFileSync("src/features/Orders/components/OrderDetails.tsx", "utf8");
    const forms = readFileSync("src/features/Orders/components/OrderWorkflowForms.tsx", "utf8");

    expect(sheet).toContain("<OrderSummarySections");
    expect(details).toContain("<OrderSummarySections");
    expect(summary).toContain("<OrderConfirmationStep");
    // Only the shared summary composes the confirmation step.
    expect(details).not.toContain("OrderConfirmationStep");
    expect(sheet).not.toContain("OrderConfirmationStep");

    // One purchase schema and one form body.
    expect(forms.match(/const purchaseSchema =/g)).toHaveLength(1);
    expect(forms.match(/export function PurchaseOrderForm/g)).toHaveLength(1);
    expect(sheet).toContain("<DeliveryPurchaseDialogContent");
    expect(sheet).not.toContain("purchaseSchema");
    expect(sheet).not.toContain("uploadOwnOrderReceipt");
  });

  test("keeps purchase replacement out of the Delivery adapter", () => {
    const forms = readFileSync("src/features/Orders/components/OrderWorkflowForms.tsx", "utf8");
    const start = forms.indexOf("export function DeliveryPurchaseDialogContent");
    const adapter = forms.slice(
      start,
      forms.indexOf("export function ", start + 1),
    );

    expect(start).toBeGreaterThan(-1);
    expect(adapter).toContain("recordOwnOrderPurchase");
    expect(adapter).toContain("uploadOwnOrderReceipt");
    expect(adapter).toContain("deleteOwnOrderReceiptCandidate");
    // No replacement affordance and no operator evidence route.
    expect(adapter).not.toContain("replace={");
    expect(adapter).not.toContain("replacePurchase");
    expect(adapter).not.toContain("uploadOrderEvidence");
    expect(adapter).not.toContain("reason");
  });

  test("routes Delivery purchases and receipts through the narrow own endpoints", () => {
    const api = readFileSync("src/services/orderApi.ts", "utf8");

    expect(api).toContain("`/orders/${id}/delivery/me`");
    expect(api).toContain("`/orders/${id}/purchase/me`");
    expect(api).toContain("`/order-evidence/me/receipts/${evidenceFileName(file)}`");
    expect(api).toContain("`/order-evidence/me/receipts/${fileName}`");
    // Delivery never reaches evidence serving or maintenance.
    expect(api).not.toContain("/order-evidence/me/deliveries");
    expect(api).not.toContain("/order-evidence/maintenance");
  });

  test("renders workflow state and warning state as separate badges", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const sheet = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryOrderSheet.tsx", "utf8");

    expect(page).toContain("workflowLabelKey(item.workflowState)");
    expect(page).toContain("categoryKey(item.category)");
    expect(sheet).toContain("workflowLabelKey(data.workflowState)");
    expect(sheet).toContain("data.openIssues.map");
    // A command refreshes the sheet in place, so the badge row is a live region.
    expect(sheet).toContain('<div className="mt-3 flex flex-wrap gap-2" role="status">');
  });

  test("names markers by family, order, and state without the address", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const map = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryMap.tsx", "utf8");

    expect(page).toContain('t("dashboard.delivery.markerLabel"');
    expect(map).toContain("const label = markerLabel(item);");
    expect(map).toContain("title: label,");
    expect(map).toContain("alt: label,");
    expect(map).not.toContain("item.address");
    expect(map).toContain('key === "Enter" || key === " "');
  });

  test("fetches the Delivery detail only while the sheet is open and invalidates it after commands", () => {
    const detailHook = readFileSync("src/features/Dashboard/DeliveryDashboard/hooks/useDeliveryOrder.ts", "utf8");
    const dashboardHook = readFileSync("src/features/Dashboard/DeliveryDashboard/hooks/useDeliveryDashboard.ts", "utf8");
    const sheet = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryOrderSheet.tsx", "utf8");

    expect(detailHook).toContain("enabled: Boolean(orderId)");
    expect(sheet).toContain("useDeliveryOrder(open ? orderId : null)");
    expect(dashboardHook).toContain("deliveryOrderKeys.all");
    expect(dashboardHook).toContain("dashboardKeys.delivery(date)");
    expect(dashboardHook).toContain("dashboardKeys.deliveryFamilies");
  });

  test("closes the sheet back to the control or the marker that opened it", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const map = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryMap.tsx", "utf8");

    expect(page).toContain("triggerRef");
    expect(page).toContain("setSelectedId(null)");
    // A row restores its own element; a marker is resolved by attempt id
    // because the map rebuilds its markers on every refetch.
    expect(page).toContain("markerTriggerRef.current = attemptId;");
    expect(page).toContain("if (marker) mapHandleRef.current?.focusMarker(marker);");
    expect(page).toContain("else trigger?.focus();");
    expect(page).toContain("handleRef={mapHandleRef}");
    expect(map).toContain("focusMarker: (attemptId) =>");
    // Selection restyles live markers; rebuilding them would destroy the
    // element focus has to return to.
    expect(map).toContain("}, [mappedItems, markerLabel, onSelect]);");
    expect(map).toContain("classList.toggle(styles.selected, selected)");
  });

  test("keeps the Delivery sheet free of operator-only affordances", () => {
    const sheet = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryOrderSheet.tsx", "utf8");

    for (const operatorOnly of [
      "DeliveryPersonCard",
      "DeliveryAssignmentCard",
      "statusEvents",
      "replacePurchase",
      "receiptStoragePath",
      "assignDelivery",
      "/orders\"",
    ]) {
      expect(sheet).not.toContain(operatorOnly);
    }
  });

  test("keeps the dashboard and Leaflet map mounted while a new date loads", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const hook = readFileSync("src/features/Dashboard/DeliveryDashboard/hooks/useDeliveryDashboard.ts", "utf8");

    expect(hook).toContain('import { keepPreviousData } from "@tanstack/react-query"');
    expect(hook).toContain("placeholderData: keepPreviousData");
    expect(page).toContain("if (!next || next === date) return;");
    expect(page).toContain("dashboard.isPlaceholderData && dashboard.isFetching");
    expect(page).toContain("isDateTransition ? (");
    expect(page).toContain('<NSpinner aria-hidden="true" size={18} />');
  });
});
