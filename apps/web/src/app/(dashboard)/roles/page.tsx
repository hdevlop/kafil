import { AdminRolesPage } from "@/features/AdminAccess";
import { requireRole } from "@/lib/session";

export const metadata = { title: "Roles" };

export default async function RolesRoutePage() {
  await requireRole(["admin"]);
  return <AdminRolesPage />;
}
