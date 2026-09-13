import { SupportAssignmentsPage } from "@/features/SupportAssignments";
import { requireRole } from "@/najm.server";

export const metadata = { title: "Support assignments" };

export default async function AssignmentsRoutePage() {
  await requireRole(["admin", "operator"]);
  return <SupportAssignmentsPage />;
}
