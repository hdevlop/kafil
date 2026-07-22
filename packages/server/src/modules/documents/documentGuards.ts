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
import { documentObjects } from "./documentSchema";

export const Document = definePolicy(documentObjects, "documents", {
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
});

export {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  Policy,
};
