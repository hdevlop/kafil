import {
  CanRead,
  CanUpdate,
  definePolicy,
  Policy,
  ROLES,
} from "../../config/authConfig";
import { platformSettings } from "./settingSchema";

export const PlatformSettingPolicy = definePolicy(platformSettings, "settings", {
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
});

export { CanRead, CanUpdate, Policy };
