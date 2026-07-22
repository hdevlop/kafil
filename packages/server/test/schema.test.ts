import { describe, expect, it } from "bun:test";
import { getTableColumns } from "drizzle-orm";

import {
  auditEvents,
  budgetAccounts,
  budgetLedgerEntries,
  categories,
  children,
  contributionPlans,
  contributions,
  documentObjects,
  familyPasswordRequirements,
  familyProfiles,
  kafilSchema,
  inventoryBalances,
  inventoryLedgerEntries,
  monthlyBudgetLimits,
  operatorProfiles,
  orderItems,
  orderStatusEvents,
  orders,
  outboxEvents,
  platformSettings,
  products,
  schema,
  sponsorProfiles,
  supportAssignments,
} from "../src/database/schema";

describe("Kafil database schema", () => {
  it("composes Najm auth tables with the Kafil foundation tables", () => {
    expect(Object.keys(schema).sort()).toEqual(
      [
        "users",
        "oauthAccounts",
        "tokens",
        "roles",
        "permissions",
        "rolePermissions",
        ...Object.keys(kafilSchema),
      ].sort(),
    );
  });

  it("keeps one family domain root without standalone households", () => {
    const familyColumns = Object.keys(getTableColumns(familyProfiles));

    expect(familyColumns).toContain("guardianLegalName");
    expect(familyColumns).toContain("guardianCin");
    expect(familyColumns).toContain("exactAddress");
    expect(familyColumns).toContain("phone");
    expect(getTableColumns(familyProfiles).guardianCin.notNull).toBe(true);
    expect(kafilSchema).not.toHaveProperty("privateHouseholds");
    expect(kafilSchema).not.toHaveProperty("publicCases");
    expect(kafilSchema).not.toHaveProperty("organisations");
    expect(kafilSchema).not.toHaveProperty("organisationMemberships");
  });

  it("owns new profile identity fields while preserving legacy data columns", () => {
    const operatorColumns = Object.keys(getTableColumns(operatorProfiles));
    const sponsorColumns = Object.keys(getTableColumns(sponsorProfiles));

    expect(operatorColumns).toEqual(
      expect.arrayContaining([
        "userId",
        "phone",
        "cin",
        "gender",
        "address",
        "dateOfBirth",
        "jobTitle",
        "notes",
        "legacyPreferredLanguage",
      ]),
    );
    expect(operatorColumns).not.toContain("preferredLanguage");
    expect(sponsorColumns).toEqual(
      expect.arrayContaining([
        "userId",
        "phone",
        "cin",
        "gender",
        "address",
        "dateOfBirth",
        "notes",
        "legacyCountryCode",
        "legacyPreferredLanguage",
        "legacyPreferredCurrency",
        "legacyCommunicationOptIn",
      ]),
    );
    expect(sponsorColumns).not.toContain("countryCode");
    expect(sponsorColumns).not.toContain("preferredLanguage");
    expect(sponsorColumns).not.toContain("preferredCurrency");
  });

  it("composes Phase 1 family, child, and append-only audit tables", () => {
    const familyColumns = getTableColumns(familyProfiles);
    const childColumns = getTableColumns(children);
    const auditColumns = getTableColumns(auditEvents);

    expect(Object.keys(familyColumns)).toEqual(
      expect.arrayContaining([
        "userId",
        "guardianLegalName",
        "guardianCin",
        "guardianDateOfBirth",
        "exactAddress",
        "phone",
        "createdByUserId",
        "relationshipToChildren",
        "notes",
        "fundingTargetMinor",
        "fundingStatus",
        "fundingActivatedAt",
      ]),
    );
    expect(familyColumns.userId.notNull).toBe(true);
    expect(familyColumns.guardianCin.notNull).toBe(true);
    expect(familyColumns.fundingTargetMinor.notNull).toBe(true);
    expect(Object.keys(childColumns)).toEqual(
      expect.arrayContaining([
        "familyProfileId",
        "legalName",
        "dateOfBirth",
        "gender",
        "status",
      ]),
    );
    expect(childColumns.familyProfileId.notNull).toBe(true);
    expect(Object.keys(auditColumns)).toEqual(
      expect.arrayContaining([
        "actorUserId",
        "action",
        "resource",
        "resourceId",
        "metadata",
        "requestId",
        "createdAt",
      ]),
    );
    expect(auditColumns.createdAt.notNull).toBe(true);
    expect(auditColumns).not.toHaveProperty("updatedAt");
  });

  it("links protected documents directly to a family profile", () => {
    const columns = getTableColumns(documentObjects);
    const documentColumns = Object.keys(columns);

    expect(documentColumns).toContain("familyProfileId");
    expect(columns.familyProfileId.notNull).toBe(true);
    expect(documentColumns).not.toContain("organisationId");
    expect(documentColumns).not.toContain("publicCaseId");
    expect(Object.keys(kafilSchema).sort()).toEqual(
      [
        "auditEvents",
        "budgetAccounts",
        "budgetLedgerEntries",
        "cartItems",
        "carts",
        "categories",
        "children",
        "contributionPlans",
        "contributions",
        "documentObjects",
        "emailVerificationTokens",
        "familyPasswordRequirements",
        "familyProfiles",
        "inventoryBalances",
        "inventoryLedgerEntries",
        "monthlyBudgetLimits",
        "operatorProfiles",
        "orderItems",
        "orderStatusEvents",
        "orders",
        "outboxEvents",
        "platformSettings",
        "products",
        "sponsorProfiles",
        "supportAssignments",
      ].sort(),
    );
  });

  it("stores a server-owned family first-login password requirement", () => {
    const columns = getTableColumns(familyPasswordRequirements);

    expect(Object.keys(columns)).toEqual([
      "userId",
      "required",
      "completedAt",
      "createdAt",
      "updatedAt",
    ]);
    expect(columns.userId.notNull).toBe(true);
    expect(columns.required.notNull).toBe(true);
  });

  it("composes Phase 3 accounts, limits, ledger, plans, and contributions", () => {
    const accountColumns = getTableColumns(budgetAccounts);
    const ledgerColumns = getTableColumns(budgetLedgerEntries);
    const limitColumns = getTableColumns(monthlyBudgetLimits);
    const planColumns = getTableColumns(contributionPlans);
    const contributionColumns = getTableColumns(contributions);

    expect(Object.keys(accountColumns)).toEqual(
      expect.arrayContaining([
        "familyProfileId",
        "currency",
        "availableMinor",
        "reservedMinor",
        "spentMinor",
        "version",
      ]),
    );
    expect(accountColumns.familyProfileId.notNull).toBe(true);
    expect(Object.keys(ledgerColumns)).toEqual(
      expect.arrayContaining([
        "budgetAccountId",
        "entryType",
        "amountMinor",
        "availableAfterMinor",
        "idempotencyKey",
        "reversesEntryId",
        "createdAt",
      ]),
    );
    expect(ledgerColumns).not.toHaveProperty("updatedAt");
    expect(Object.keys(limitColumns)).toEqual(
      expect.arrayContaining([
        "budgetAccountId",
        "month",
        "limitMinor",
        "setByUserId",
        "reason",
      ]),
    );
    expect(Object.keys(planColumns)).toEqual(
      expect.arrayContaining([
        "supportAssignmentId",
        "kind",
        "amountMinor",
        "currency",
        "status",
      ]),
    );
    expect(Object.keys(contributionColumns)).toEqual(
      expect.arrayContaining([
        "contributionPlanId",
        "supportAssignmentId",
        "sponsorProfileId",
        "familyProfileId",
        "amountMinor",
        "status",
        "validatedByUserId",
        "rejectedByUserId",
      ]),
    );
  });

  it("composes Phase 4 catalog products and inventory ledgers", () => {
    const categoryColumns = getTableColumns(categories);
    const productColumns = getTableColumns(products);
    const balanceColumns = getTableColumns(inventoryBalances);
    const ledgerColumns = getTableColumns(inventoryLedgerEntries);

    expect(Object.keys(categoryColumns)).toEqual(
      expect.arrayContaining(["name", "slug", "status", "sortOrder"]),
    );
    expect(Object.keys(productColumns)).toEqual(
      expect.arrayContaining([
        "categoryId",
        "sku",
        "priceMinor",
        "currency",
        "imageUrl",
        "status",
      ]),
    );
    expect(Object.keys(balanceColumns)).toEqual(
      expect.arrayContaining(["productId", "onHandQuantity", "reservedQuantity"]),
    );
    expect(Object.keys(ledgerColumns)).toEqual(
      expect.arrayContaining([
        "productId",
        "entryType",
        "quantity",
        "onHandAfter",
        "reservedAfter",
        "idempotencyKey",
      ]),
    );
    expect(ledgerColumns).not.toHaveProperty("updatedAt");
  });

  it("composes Phase 5 carts, immutable order snapshots, and status events", () => {
    const orderColumns = getTableColumns(orders);
    const itemColumns = getTableColumns(orderItems);
    const eventColumns = getTableColumns(orderStatusEvents);

    expect(Object.keys(kafilSchema)).toContain("carts");
    expect(Object.keys(kafilSchema)).toContain("cartItems");
    expect(Object.keys(orderColumns)).toEqual(
      expect.arrayContaining([
        "orderNumber",
        "submissionIdempotencyKey",
        "familyProfileId",
        "status",
        "subtotalMinor",
        "totalMinor",
        "guardianLegalNameSnapshot",
        "deliveryAddressSnapshot",
        "placedByUserId",
        "approvedAt",
        "rejectedAt",
        "cancelledAt",
        "preparationStartedAt",
        "deliveredAt",
      ]),
    );
    expect(Object.keys(itemColumns)).toEqual(
      expect.arrayContaining([
        "orderId",
        "productId",
        "productNameSnapshot",
        "skuSnapshot",
        "unitPriceMinor",
        "quantity",
        "lineTotalMinor",
      ]),
    );
    expect(Object.keys(eventColumns)).toEqual(
      expect.arrayContaining([
        "orderId",
        "fromStatus",
        "toStatus",
        "actorUserId",
        "reason",
      ]),
    );
    expect(eventColumns.createdAt.notNull).toBe(true);
    expect(eventColumns).not.toHaveProperty("updatedAt");
  });

  it("composes durable outbox rows for committed financial notifications", () => {
    const columns = getTableColumns(outboxEvents);

    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "topic",
        "aggregateType",
        "aggregateId",
        "payload",
        "status",
        "attempts",
        "availableAt",
      ]),
    );
  });

  it("stores the configurable family funding target as a singleton setting", () => {
    const columns = getTableColumns(platformSettings);

    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "familyFundingTargetMinor",
        "currency",
        "updatedByUserId",
      ]),
    );
    expect(columns.familyFundingTargetMinor.notNull).toBe(true);
  });

  it("composes support assignments with lifecycle and privacy boundaries", () => {
    const columns = getTableColumns(supportAssignments);

    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "sponsorProfileId",
        "familyProfileId",
        "childId",
        "status",
        "startedAt",
        "endedAt",
        "assignedByUserId",
        "endedByUserId",
        "notes",
      ]),
    );
    expect(columns.sponsorProfileId.notNull).toBe(true);
    expect(columns.familyProfileId.notNull).toBe(true);
    expect(columns.assignedByUserId.notNull).toBe(true);
  });
});
