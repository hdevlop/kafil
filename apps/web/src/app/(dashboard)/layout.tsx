import { requireSession } from "@/lib/session";
import { DashboardShell } from "@/shared/DashboardShell";
import { FamilyPasswordRequirementGuard } from "@/shared/FamilyPasswordRequirementGuard";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();

  return (
    <FamilyPasswordRequirementGuard role={session.user.role}>
      <DashboardShell user={session.user}>{children}</DashboardShell>
    </FamilyPasswordRequirementGuard>
  );
}
