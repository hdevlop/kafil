import {
  authSchema,
  credentialSetupSessionsTable,
  oauthAccountsTable,
  permissionsTable,
  rolePermissionsTable,
  rolesTable,
  tokenStatusEnum,
  tokenTypeEnum,
  tokensTable,
  userStatusEnum,
  usersTable,
} from "najm-auth/pg";

import { auditSchema } from "../modules/audit/auditSchema";
import { accessSchema } from "../modules/access/accessSchema";
import { applicantSchema } from "../modules/applicants/applicantSchema";
import { budgetSchema } from "../modules/budgets/budgetSchema";
import { childSchema } from "../modules/children/childSchema";
import { catalogSchema } from "../modules/catalog/catalogSchema";
import { contributionSchema } from "../modules/contributions/contributionSchema";
import { documentSchema } from "../modules/documents/documentSchema";
import { familySchema } from "../modules/families/familySchema";
import { operatorSchema } from "../modules/operators/operatorSchema";
import { orderSchema } from "../modules/orders/orderSchema";
import { outboxSchema } from "../modules/outbox/outboxSchema";
import { settingSchema } from "../modules/settings/settingSchema";
import { sponsorSchema } from "../modules/sponsors/sponsorSchema";
import { staffSchema } from "../modules/staff/staffSchema";
import { supportAssignmentSchema } from "../modules/supportAssignments/supportAssignmentSchema";
import {
  budgetLedgerEntryTypeEnum,
  categoryStatusEnum,
  childStatusEnum,
  contributionPlanKindEnum,
  contributionPlanStatusEnum,
  contributionStatusEnum,
  deliveryConfirmationMethodEnum,
  genderEnum,
  familyFundingStatusEnum,
  familyHousingSituationEnum,
  familySupportPriorityEnum,
  inventoryLedgerEntryTypeEnum,
  orderAssistanceChannelEnum,
  orderDeliveryAttemptStatusEnum,
  orderPlacementSourceEnum,
  orderStatusEnum,
  outboxEventStatusEnum,
  productStatusEnum,
  staffAffiliationEnum,
  staffStatusEnum,
  supportAssignmentStatusEnum,
} from "./enums";

// Drizzle Kit needs every table and enum exposed by this entry point.
export {
  oauthAccountsTable,
  permissionsTable,
  rolePermissionsTable,
  rolesTable,
  tokenStatusEnum,
  tokenTypeEnum,
  tokensTable,
  userStatusEnum,
  usersTable,
  credentialSetupSessionsTable,
  budgetLedgerEntryTypeEnum,
  categoryStatusEnum,
  childStatusEnum,
  contributionPlanKindEnum,
  contributionPlanStatusEnum,
  contributionStatusEnum,
  deliveryConfirmationMethodEnum,
  genderEnum,
  familyFundingStatusEnum,
  familyHousingSituationEnum,
  familySupportPriorityEnum,
  inventoryLedgerEntryTypeEnum,
  orderAssistanceChannelEnum,
  orderDeliveryAttemptStatusEnum,
  orderPlacementSourceEnum,
  orderStatusEnum,
  outboxEventStatusEnum,
  productStatusEnum,
  staffAffiliationEnum,
  staffStatusEnum,
  supportAssignmentStatusEnum,
};
export * from "../modules/audit/auditSchema";
export * from "../modules/access/accessSchema";
export * from "../modules/applicants/applicantSchema";
export * from "../modules/budgets/budgetSchema";
export * from "../modules/catalog/catalogSchema";
export * from "../modules/children/childSchema";
export * from "../modules/contributions/contributionSchema";
export * from "../modules/documents/documentSchema";
export * from "../modules/families/familySchema";
export * from "../modules/operators/operatorSchema";
export * from "../modules/orders/orderSchema";
export * from "../modules/outbox/outboxSchema";
export * from "../modules/settings/settingSchema";
export * from "../modules/sponsors/sponsorSchema";
export * from "../modules/staff/staffSchema";
export * from "../modules/supportAssignments/supportAssignmentSchema";

export const kafilSchema = {
  ...accessSchema,
  ...applicantSchema,
  ...auditSchema,
  ...budgetSchema,
  ...catalogSchema,
  ...childSchema,
  ...contributionSchema,
  ...familySchema,
  ...operatorSchema,
  ...orderSchema,
  ...outboxSchema,
  ...settingSchema,
  ...sponsorSchema,
  ...staffSchema,
  ...supportAssignmentSchema,
  ...documentSchema,
};

export const schema = {
  ...authSchema,
  ...kafilSchema,
};
