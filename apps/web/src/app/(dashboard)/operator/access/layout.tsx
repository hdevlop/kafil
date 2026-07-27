import { requireRole } from "@/lib/session";

export default async function AdminAccessLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole(["admin"]);
  return children;
}
