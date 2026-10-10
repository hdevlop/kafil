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
import { documentObjects } from "./documentSchema";

export const Document = own(documentObjects, {
  name: "documents",
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
