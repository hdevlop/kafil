import { FamilyFirstPasswordForm } from "@/features/Auth/components/FamilyFirstPasswordForm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = { title: "Choose a password" };

export default async function ChangePasswordPage() {
  const cookieStore = await cookies();
  if (!cookieStore.has("kafil.family-setup")) redirect("/login");

  return <FamilyFirstPasswordForm />;
}
