import { where } from "najm-auth";

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
import { notifications } from "./notificationSchema";

// No admin override: every role, including admin, sees only its own inbox.
// Admin therefore appears as an explicit personal recipient rule, not as a
// bypass. The service re-scopes every read/update by recipient_user_id.
export const Notification = definePolicy(notifications, "notifications", {
  adminRoles: [],
})
  .for(ROLES.ADMIN, where(notifications.recipientUserId))
  .for(ROLES.OPERATOR, where(notifications.recipientUserId))
  .for(ROLES.FAMILY, where(notifications.recipientUserId))
  .for(ROLES.SPONSOR, where(notifications.recipientUserId));

export { CanCreate, CanDelete, CanList, CanRead, CanUpdate, Policy };
