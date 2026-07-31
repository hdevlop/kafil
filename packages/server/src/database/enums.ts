import { pgEnum } from "drizzle-orm/pg-core";

export const genderEnum = pgEnum("gender", ["M", "F"]);
export const childStatusEnum = pgEnum("child_status", ["active", "inactive"]);
export const familyFundingStatusEnum = pgEnum("family_funding_status", [
  "pending_funding",
  "active",
]);
export const familyHousingSituationEnum = pgEnum("family_housing_situation", [
  "owned",
  "rented",
  "hosted",
  "temporary",
  "unknown",
]);
export const familySupportPriorityEnum = pgEnum("family_support_priority", [
  "normal",
  "high",
  "urgent",
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
  "expired",
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
  "purchased",
  "out_for_delivery",
  "delivered",
  "rejected",
  "cancelled",
]);
export const orderPlacementSourceEnum = pgEnum("order_placement_source", [
  "family_self_service",
  "operator_assisted",
]);
export const orderAssistanceChannelEnum = pgEnum("order_assistance_channel", [
  "phone",
  "in_person",
  "home_visit",
  "other",
]);
export const deliveryConfirmationMethodEnum = pgEnum(
  "delivery_confirmation_method",
  ["operator_confirmation", "recipient_signature", "photo"],
);
export const orderDeliveryAttemptStatusEnum = pgEnum(
  "order_delivery_attempt_status",
  ["assigned", "in_progress", "failed", "delivered", "cancelled"],
);
export const outboxEventStatusEnum = pgEnum("outbox_event_status", [
  "pending",
  "processing",
  "sent",
  "failed",
]);
export const staffAffiliationEnum = pgEnum("staff_affiliation", [
  "internal",
  "external",
]);
export const staffStatusEnum = pgEnum("staff_status", ["active", "inactive"]);
