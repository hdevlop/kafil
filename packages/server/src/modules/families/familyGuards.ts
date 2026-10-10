import { where } from "najm-auth";

import {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  own,
  ROLES,
} from "../../config/authConfig";
import { familyProfiles } from "./familySchema";

export const Family = own(familyProfiles, {
  name: "families",
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
}).for(ROLES.FAMILY, where(familyProfiles.userId));

export { CanCreate, CanDelete, CanList, CanRead, CanUpdate };
