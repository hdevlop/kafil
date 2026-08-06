import { AdminUsersPage } from "@/features/AdminAccess";
import { requireRole } from "@/lib/session";

export const metadata = { title: "Users" };

export default async function UsersRoutePage() {
  await requireRole(["admin"]);
  return <AdminUsersPage />;
}
