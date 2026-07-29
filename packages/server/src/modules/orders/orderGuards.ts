import { CanCreate, CanDelete, CanList, CanRead, CanUpdate, definePolicy, Policy, ROLES } from "../../config/authConfig";
import { orders } from "./orderSchema";

export const OrderResource = definePolicy(orders, "orders", {
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
});

export { CanCreate, CanDelete, CanList, CanRead, CanUpdate, Policy };
