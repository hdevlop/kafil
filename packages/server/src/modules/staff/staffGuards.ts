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
import { staffProfiles } from "./staffSchema";

export const Staff = definePolicy(staffProfiles, "staff", {
  adminRoles: [ROLES.ADMIN],
});

export const StaffDeliveryOptions = definePolicy(
  staffProfiles,
  "staffDeliveryOptions",
  {
    adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
  },
);

export {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  Policy,
};