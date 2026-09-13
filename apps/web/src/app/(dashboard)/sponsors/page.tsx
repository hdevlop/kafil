import { SponsorsPage } from "@/features/Sponsors";
import { requireRole } from "@/najm.server";

export const metadata = { title: "Sponsors" };

export default async function SponsorsRoutePage() {
  await requireRole(["admin", "operator"]);
  return <SponsorsPage />;
}
