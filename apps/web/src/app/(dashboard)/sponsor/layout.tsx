import { requireRole } from "@/lib/session";

export default async function SponsorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole(["sponsor"]);
  return children;
}
