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
import { products } from "./catalogSchema";

export const Catalog = own(products, {
  name: "catalog",
  adminRoles: [ROLES.ADMIN, ROLES.OPERATOR],
});

export { CanCreate, CanDelete, CanList, CanRead, CanUpdate, Policy };
