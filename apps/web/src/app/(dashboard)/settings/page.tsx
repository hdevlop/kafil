import { SettingsPage } from "@/features/Settings";
import { requireRole } from "@/lib/session";

export const metadata = { title: "Platform settings" };

export default async function SettingsRoutePage() {
  const session = await requireRole(["admin", "operator"]);
  return <SettingsPage role={session.user.role} />;
}
