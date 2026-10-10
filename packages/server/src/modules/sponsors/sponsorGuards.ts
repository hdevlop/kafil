import { where } from "najm-auth";

import {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  own,
  Policy,
  ROLES,
} from "../../config/authConfig";
import { sponsorProfiles } from "./sponsorSchema";

export const Sponsor = own(sponsorProfiles, {
  name: "sponsors",
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
