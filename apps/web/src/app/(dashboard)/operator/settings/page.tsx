import { SettingsPage } from "@/features/Settings";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Platform settings" };

export default async function OperatorSettingsPage() {
  const session = await requireSession();
  return <SettingsPage role={session.user.role} />;
}
