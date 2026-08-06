import { AdminPermissionsPage } from "@/features/AdminAccess";
import { requireRole } from "@/lib/session";

export const metadata = { title: "Permissions" };

export default async function PermissionsRoutePage() {
  await requireRole(["admin"]);
  return <AdminPermissionsPage />;
}
