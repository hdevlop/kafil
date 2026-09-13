import { AdminUsersPage } from "@/features/AdminAccess";
import { requireRole } from "@/najm.server";

export const metadata = { title: "Users" };

export default async function UsersRoutePage() {
  await requireRole(["admin"]);
  return <AdminUsersPage />;
}
