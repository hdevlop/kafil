import { pgEnum } from "drizzle-orm/pg-core";

export const genderEnum = pgEnum("gender", ["M", "F"]);
export const childStatusEnum = pgEnum("child_status", ["active", "inactive"]);
export const familyFundingStatusEnum = pgEnum("family_funding_status", [
  "pending_funding",
  "active",
]);
export const supportAssignmentStatusEnum = pgEnum(
  "support_assignment_status",
  ["active", "ended"],
);
export const budgetLedgerEntryTypeEnum = pgEnum("budget_ledger_entry_type", [
  "contribution_credit",
  "manual_credit",
  "manual_debit",
  "order_reserve",
  "order_capture",
  "order_release",
  "order_refund",
  "contribution_refund",
]);
export const contributionPlanKindEnum = pgEnum("contribution_plan_kind", [
  "monthly",
  "one_time",
]);
export const contributionPlanStatusEnum = pgEnum("contribution_plan_status", [
  "active",
  "paused",
  "stopped",
  "completed",
]);
export const contributionStatusEnum = pgEnum("contribution_status", [
  "pending",
  "validated",
  "rejected",
  "refunded",
]);
export const categoryStatusEnum = pgEnum("category_status", [
  "active",
  "inactive",
]);
export const productStatusEnum = pgEnum("product_status", [
  "active",
  "inactive",
]);
export const inventoryLedgerEntryTypeEnum = pgEnum(
  "inventory_ledger_entry_type",
  [
    "restock",
    "adjustment",
    "order_reserve",
    "order_release",
    "order_allocate",
    "order_return",
  ],
);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "approved",
  "in_preparation",
  "delivered",
  "rejected",
  "cancelled",
]);
export const outboxEventStatusEnum = pgEnum("outbox_event_status", [
  "pending",
  "processing",
  "sent",
  "failed",
]);
