import { requireSession } from "@/lib/session";
import { DashboardShell } from "@/shared/DashboardShell";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
