import {
  CanRead,
  CanUpdate,
  own,
  Policy,
  ROLES,
} from "../../config/authConfig";
import { platformSettings } from "./settingSchema";

export const PlatformSettingPolicy = own(platformSettings, {
  name: "settings",
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
});

export { CanRead, CanUpdate, Policy };
