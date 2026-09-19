import { ContributionsPage } from "@/features/Contributions";
import { requireRole } from "@/najm.server";

export const metadata = { title: "Contributions" };

export default async function ContributionPage() {
  await requireRole(["admin", "operator", "sponsor"]);
  return <ContributionsPage />;
}
