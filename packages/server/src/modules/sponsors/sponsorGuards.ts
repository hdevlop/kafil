import { where } from "najm-auth";

import {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  definePolicy,
  Policy,
  ROLES,
} from "../../config/authConfig";
import { sponsorProfiles } from "./sponsorSchema";

export const Sponsor = definePolicy(sponsorProfiles, "sponsors", {
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
}).for(ROLES.SPONSOR, where(sponsorProfiles.userId));

export {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  Policy,
};
