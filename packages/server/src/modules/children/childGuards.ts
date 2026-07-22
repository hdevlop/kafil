import { join, where } from "najm-auth";

import {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  definePolicy,
  ROLES,
} from "../../config/authConfig";
import { familyProfiles } from "../families/familySchema";
import { children } from "./childSchema";

export const Child = definePolicy(children, "children", {
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
}).for(
  ROLES.FAMILY,
  join(children.familyProfileId, familyProfiles.id),
  where(familyProfiles.userId),
);

export { CanCreate, CanDelete, CanList, CanRead, CanUpdate };
