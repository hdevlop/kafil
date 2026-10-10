import { CanCreate, CanDelete, CanList, CanRead, CanUpdate, own, Policy, ROLES } from "../../config/authConfig";
import { orders } from "./orderSchema";

export const OrderResource = own(orders, {
  name: "orders",
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
});

export { CanCreate, CanDelete, CanList, CanRead, CanUpdate, Policy };
