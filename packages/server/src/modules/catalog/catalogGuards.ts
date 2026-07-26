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
import { products } from "./catalogSchema";

export const Catalog = definePolicy(products, "catalog", {
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
});

export { CanCreate, CanDelete, CanList, CanRead, CanUpdate, Policy };
