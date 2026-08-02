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
import { familyProfiles } from "../families/familySchema";
import { contributions } from "./contributionSchema";

export const Contribution = definePolicy(contributions, "contributions", {
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
}).for(
  ROLES.SPONSOR,
  join(contributions.sponsorProfileId, sponsorProfiles.id),
  where(sponsorProfiles.userId),
).for(
  ROLES.FAMILY,
  join(contributions.familyProfileId, familyProfiles.id),
  where(familyProfiles.userId),
);

export { CanCreate, CanDelete, CanList, CanRead, CanUpdate, Policy };
