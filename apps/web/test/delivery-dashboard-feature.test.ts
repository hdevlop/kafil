import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { getDashboardNavigation } from "../src/shared/DashboardShell/navigation";
import { dashboardKeys } from "../src/features/Dashboard/shared/dashboardKeys";

describe("delivery dashboard source contracts", () => {
  test("gives Delivery its dashboard, family list, and notification inbox", () => {
    expect(getDashboardNavigation("operator").map((item) => item.href)).toContain("/dashboard");
    expect(getDashboardNavigation("delivery").map((item) => item.href)).toEqual(["/dashboard", "/family", "/notifications"]);
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

  test("keeps Today and the date picker on the map card title row", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");

    expect(page.match(/<NCardAction>/g)).toHaveLength(1);
    expect(page.match(/dashboard\.delivery\.today"/g)).toHaveLength(1);
    expect(page.match(/<DateInput/g)).toHaveLength(1);
    expect(page).toContain('className="h-10 px-3"');
    expect(page).toContain('icon={MapPin}');
    expect(page).toContain("title={t(\"dashboard.delivery.mapTitle\")}");
    expect(page).toContain("description={t(\"dashboard.delivery.mapSubtitle\")}");

    // The header is one row: the wrapping override is gone and the subtitle
    // is capped to a single line so it cannot push the action slot down.
    expect(page).not.toContain("flex-wrap gap-2");
    expect(page).toContain('header: "gap-2"');
    expect(page).toContain('description: "truncate"');
  });

  test("keeps the date transition indicator out of the header width", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");

    // The spinner lives in the date field's own icon slot inside a container
    // of the field's fixed width, so the action row never changes size.
    expect(page).toContain('<div className="relative w-32 sm:w-48">');
    expect(page).toContain("showIcon={!isDateTransition}");
    expect(page).toContain('className="pointer-events-none absolute inset-y-0 end-2 flex items-center"');
    expect(page).toContain('role="status"');
    expect(page).toContain("aria-busy={isDateTransition}");
    expect(page).toContain('<span className="sr-only">{t("state.loading")}</span>');
    expect(page).toContain('<NSpinner aria-hidden="true" size={16} />');

    // The old standalone 40-pixel spinner sibling is gone.
    expect(page).not.toContain('inline-flex size-10 items-center justify-center');
    // Logical, not physical, so Arabic RTL mirrors instead of breaking.
    expect(page).not.toContain("right-2");
    expect(page).not.toContain("left-2");
  });

  test("puts statistics first, then the map and plan workspace", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const pageHeader = page.indexOf("<NPageHeader");
    const stats = page.indexOf("<NStatCard");
    const map = page.indexOf("<DeliveryMap");
    const list = page.indexOf('id="delivery-list"');

    expect(pageHeader).toBeGreaterThan(-1);
    // Every dashboard section follows the page header.
    for (const section of ["<NGrid", "<NStatCard", "<DeliveryMap", '<div id="delivery-list"', "<NPieChart"]) {
      expect(page.indexOf(section)).toBeGreaterThan(pageHeader);
    }
    // Statistics, then the map, then the plan beside it.
    expect(stats).toBeGreaterThan(pageHeader);
    expect(map).toBeGreaterThan(stats);
    expect(list).toBeGreaterThan(map);
    // The six statistics keep their existing breakpoints and card variants.
    expect(page).toContain('<NGrid className="shrink-0" cols={2} lgCols={3} xlCols={6}>');
    expect(page).toContain('<NStatCard variant="compact"');
    expect(page).not.toContain("overflow-x-auto");

    // The overview now shares the plan row; the remaining panels follow it.
    expect(page.indexOf("<NPieChart")).toBeGreaterThan(list);
    for (const secondary of ["<DashboardAttentionCard", "<DashboardQuickActionsCard"]) {
      expect(page.indexOf(secondary)).toBeGreaterThan(list);
      expect(page.indexOf(secondary)).toBeGreaterThan(page.indexOf("<NPieChart"));
    }

    // The permanent in-map detail overlay is gone.
    expect(page).not.toContain("absolute inset-x-3 bottom-3");
    expect(page).not.toContain("backdrop-blur");
    expect(page).not.toContain("z-[500]");
  });

  test("gives the map a full-height half-width workspace at xl", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const workspace = page.slice(
      page.indexOf('<NGrid className="xl:min-h-0 xl:flex-1" cols={1} xlCols={2}>'),
      page.indexOf("<DeliveryOrderSheet"),
    );

    expect(page).toContain('<NGrid className="xl:min-h-0 xl:flex-1" cols={1} xlCols={2}>');
    expect(workspace.match(/xlSpan=\{1\}/g)).toHaveLength(2);
    expect(workspace).toContain('data-testid="delivery-workspace-side"');
    // Map first, plan second, inside the same grid.
    expect(workspace.indexOf("<DeliveryMap")).toBeLessThan(
      workspace.indexOf('id="delivery-list"'),
    );
    // Exactly one Scheduled deliveries card, heading, and scroll target.
    expect(page.match(/id="delivery-list"/g)).toHaveLength(1);
    expect(page.match(/dashboard\.delivery\.todaysDeliveries/g)).toHaveLength(1);
    expect(page).toContain('document.getElementById("delivery-list")');
    // The map and the complete right-hand workspace fill the same row height.
    expect(workspace).toContain('className="h-full xl:min-h-0"');
    expect(workspace).toContain('content: "flex min-h-0 flex-col xl:flex-1"');
    expect(workspace).toContain('className="flex h-full min-h-0 flex-col gap-4"');
    expect(workspace).toContain('<div className="grid min-h-0 gap-4 md:grid-cols-2 xl:flex-1">');
    expect(workspace).toContain('<div id="delivery-list" className="min-h-72 xl:min-h-0">');
    // The map keeps its stacked minimum heights.
    expect(page).toContain('min-h-[26rem] flex-1 overflow-hidden rounded-xl border sm:min-h-[34rem]');
    // Scrolling is scoped to the delivery rows at xl; the map never scrolls.
    expect(page.match(/overflow-y-auto/g)).toHaveLength(1);
    expect(page).toContain('<div className="space-y-1 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">');

    // Overview shares the upper row with the plan; attention and actions share the lower row.
    expect(workspace.indexOf('id="delivery-list"')).toBeLessThan(workspace.indexOf("<NPieChart"));
    expect(workspace.indexOf("<NPieChart")).toBeLessThan(workspace.indexOf("<DashboardAttentionCard"));
    expect(page.match(/<div className="grid min-h-0 gap-4 md:grid-cols-2 xl:flex-1">/g)).toHaveLength(2);
  });

  test("fits the viewport at xl and scrolls naturally below it", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");

    // The page owns the shell's scroll height at xl, like the Sponsor dashboard.
    expect(page).toContain('<NPageLayout className="flex min-h-full flex-col gap-4 xl:h-full xl:min-h-0">');
    // Statistics keep their height; the two-column workspace absorbs the rest.
    expect(page).toContain('<NGrid className="shrink-0" cols={2} lgCols={3} xlCols={6}>');
    expect(page).toContain('className="xl:min-h-0 xl:flex-1" cols={1} xlCols={2}');
    expect(page.match(/md:grid-cols-2 xl:flex-1/g)).toHaveLength(2);
    // The map and the plan can both shrink below their stacked minimums at xl.
    expect(page).toContain('className="h-full xl:min-h-0"');
    expect(page).toContain("sm:min-h-[34rem] xl:min-h-0");
    expect(page).toContain('className="h-full min-h-72 xl:min-h-0"');
    // Only the rows scroll, and only where the card height is bounded.
    expect(page).toContain('classNames={{ content: "xl:min-h-0 xl:flex-1" }}');
    expect(page).toContain('<div className="space-y-1 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">');
    expect(page).toContain('className="w-full shrink-0"');
    // Nothing forces an unconditional inner scroller or a fixed pixel height.
    expect(page).not.toContain("h-[calc(");
    expect(page).not.toContain("overflow-y-scroll");
  });

  test("keeps Show all, selection, and focus restoration on the moved list", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const list = page.slice(page.indexOf('<div id="delivery-list"'), page.indexOf("<NPieChart"));

    expect(list).toContain("showAll ? items : items.slice(0, 5)");
    expect(list).toContain("item.attemptId === effectiveSelectedId");
    expect(list).toContain("openAttempt(item.attemptId, event.currentTarget)");
    expect(list).toContain("dashboard.delivery.showLess");
    expect(list).toContain("dashboard.delivery.viewAll");
    expect(list).toContain("<NEmptyState");
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
    expect(summary).toContain("imageUrl: item.imageUrl");
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

  test("uses the authorized order projection for product images", () => {
    const cart = readFileSync("src/features/OrderCart/components/OrderCartDialog.tsx", "utf8");
    const summary = readFileSync("src/features/Orders/components/OrderSummarySections.tsx", "utf8");
    const deliveryTypes = readFileSync("src/features/Dashboard/types.ts", "utf8");

    expect(summary).toContain("imageUrl: string | null");
    expect(summary).toContain("imageUrl: item.imageUrl");
    expect(deliveryTypes).toContain("imageUrl: string | null");
    expect(cart).toContain("enabled: item.imageUrl === undefined");
    expect(cart).not.toContain("enabled: !item.imageUrl");
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
    expect(sheet).toContain("data.openIssues.map");
    // The compact workflow tag is intentionally omitted from the detail sheet;
    // open issue warnings remain a separately announced live region.
    expect(sheet).not.toContain("workflowLabelKey(data.workflowState)");
    expect(sheet).toContain('<div className="mt-3 flex flex-wrap gap-2" role="status">');
  });

  test("keeps schedule details in Family and contact actions with the sticky workflow action", () => {
    const sheet = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryOrderSheet.tsx", "utf8");
    const summary = readFileSync("src/features/Orders/components/OrderSummarySections.tsx", "utf8");
    const confirmation = readFileSync("src/features/OrderCart/components/OrderCartDialog.tsx", "utf8");
    const family = confirmation.indexOf('aria-labelledby="order-confirmation-family"');
    const products = confirmation.indexOf('aria-labelledby="order-confirmation-products"');

    expect(sheet).not.toContain("leadingContent={contactActions}");
    expect(sheet).toContain("familyDetails={scheduleDetails}");
    expect(sheet).not.toContain("afterFamily={schedule}");
    expect(sheet).not.toContain('id="delivery-order-schedule"');
    expect(sheet).not.toContain('t("dashboard.delivery.orderSchedule")');
    expect(sheet.match(/dashboard\.delivery\.callFamily/g)).toHaveLength(1);
    expect(sheet.match(/dashboard\.delivery\.openMaps/g)).toHaveLength(1);
    expect(sheet).toContain("<DeliveryContactActions data={order.data} />");
    expect(sheet.match(/className="size-10 p-0"/g)).toHaveLength(2);
    expect(sheet.match(/variant="outline"/g)).toHaveLength(2);
    expect(sheet).toContain('className="flex w-full items-center gap-2"');
    expect(sheet.indexOf("<DeliverySheetFooter data={order.data}"))
      .toBeLessThan(sheet.indexOf("<DeliveryContactActions data={order.data} />"));
    expect(sheet).toContain('t("dashboard.delivery.scheduleDate")');
    expect(sheet).not.toContain('t("dashboard.delivery.scheduleTime")');
    expect(sheet).toContain("showProductsDivider={false}");
    expect(sheet).not.toContain("data.attempt.packageCount");
    expect(sheet).not.toContain('t("dashboard.delivery.packages")');

    expect(summary).toContain("leadingContent={leadingContent}");
    expect(summary).toContain("familyDetails={familyDetails}");
    expect(summary).toContain("afterFamily={afterFamily}");
    expect(confirmation.indexOf("{leadingContent}")).toBeLessThan(family);
    expect(confirmation.indexOf("{leadingContent}")).toBeLessThan(family);
    expect(family).toBeLessThan(products);
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
    expect(page).toContain('<NSpinner aria-hidden="true" size={16} />');
    // The map stays mounted: the indicator is an overlay on the date field,
    // not a branch that replaces the card.
    expect(page.match(/<DeliveryMap/g)).toHaveLength(1);
  });
});
