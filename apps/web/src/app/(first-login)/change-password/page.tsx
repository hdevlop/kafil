import { FamilyFirstPasswordForm } from "@/features/Auth/components/FamilyFirstPasswordForm";
import { requireRole } from "@/lib/session";

export const metadata = { title: "Choose a password" };

export default async function ChangePasswordPage() {
  await requireRole(["family"]);
  return <FamilyFirstPasswordForm />;
}
