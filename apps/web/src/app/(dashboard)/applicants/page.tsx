import { ApplicantsPage } from "@/features/Applicants";
import { requireRole } from "@/najm.server";

export const metadata = { title: "Applicants" };

export default async function ApplicantsRoutePage() {
  await requireRole(["admin"]);
  return <ApplicantsPage />;
}
