import { requireRole } from "@/najm.server";

export default async function SponsorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole(["sponsor"]);
  return children;
}
