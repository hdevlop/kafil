import { AdminPermissionsPage } from "@/features/AdminAccess";
import { requireRole } from "@/najm.server";

export const metadata = { title: "Permissions" };

export default async function PermissionsRoutePage() {
  await requireRole(["admin"]);
  return <AdminPermissionsPage />;
}
