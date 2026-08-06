import { SponsorsPage } from "@/features/Sponsors";
import { requireRole } from "@/lib/session";

export const metadata = { title: "Sponsors" };

export default async function SponsorsRoutePage() {
  await requireRole(["admin", "operator"]);
  return <SponsorsPage />;
}
