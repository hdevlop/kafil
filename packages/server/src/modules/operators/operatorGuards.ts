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
import { operatorProfiles } from "./operatorSchema";

export const Operator = definePolicy(operatorProfiles, "operators", {
  adminRoles: [ROLES.ADMIN],
});

export {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  Policy,
};
