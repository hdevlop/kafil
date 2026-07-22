import { join, where } from "najm-auth";

import {
  CanCreate,
  CanList,
  CanRead,
  CanUpdate,
  definePolicy,
  Policy,
  ROLES,
} from "../../config/authConfig";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import { supportAssignments } from "./supportAssignmentSchema";

export const SupportAssignment = definePolicy(
  supportAssignments,
  "supportAssignments",
  { adminRoles: [ROLES.ADMIN, ROLES.OPERATOR] },
).for(
  ROLES.SPONSOR,
  join(supportAssignments.sponsorProfileId, sponsorProfiles.id),
  where(sponsorProfiles.userId),
);

export { CanCreate, CanList, CanRead, CanUpdate, Policy };
