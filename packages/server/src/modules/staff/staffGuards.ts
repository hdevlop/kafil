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
import { staffProfiles } from "./staffSchema";

export const Staff = own(staffProfiles, {
  name: "staff",
  adminRoles: [ROLES.ADMIN],
});

export const StaffDeliveryOptions = own(staffProfiles, {
  name: "staffDeliveryOptions",
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