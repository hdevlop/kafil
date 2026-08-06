import { SupportAssignmentsPage } from "@/features/SupportAssignments";
import { requireRole } from "@/lib/session";

export const metadata = { title: "Support assignments" };

export default async function AssignmentsRoutePage() {
  await requireRole(["admin", "operator"]);
  return <SupportAssignmentsPage />;
}
