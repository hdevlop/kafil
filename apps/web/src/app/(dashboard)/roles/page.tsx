import { AdminRolesPage } from "@/features/AdminAccess";
import { requireRole } from "@/najm.server";

export const metadata = { title: "Roles" };

export default async function RolesRoutePage() {
  await requireRole(["admin"]);
  return <AdminRolesPage />;
}
