import { join, where } from "najm-auth";

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
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import { contributions } from "./contributionSchema";

export const Contribution = definePolicy(contributions, "contributions", {
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
}).for(
  ROLES.SPONSOR,
  join(contributions.sponsorProfileId, sponsorProfiles.id),
  where(sponsorProfiles.userId),
);

export { CanCreate, CanDelete, CanList, CanRead, CanUpdate, Policy };
