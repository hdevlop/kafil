import { join, where } from "najm-auth";

import {
  CanRead,
  CanUpdate,
  definePolicy,
  Policy,
  ROLES,
} from "../../config/authConfig";
import { familyProfiles } from "../families/familySchema";
import { budgetAccounts } from "./budgetSchema";

export const Budget = definePolicy(budgetAccounts, "budgets", {
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
}).for(
  ROLES.FAMILY,
  join(budgetAccounts.familyProfileId, familyProfiles.id),
  where(familyProfiles.userId),
);

export { CanRead, CanUpdate, Policy };
