import { ApplicantsPage } from "@/features/Applicants";
import { requireRole } from "@/lib/session";

export const metadata = { title: "Applicants" };

export default async function ApplicantsRoutePage() {
  await requireRole(["admin"]);
  return <ApplicantsPage />;
}
