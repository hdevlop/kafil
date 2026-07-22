import { requireRole } from "@/lib/session";

export default async function OperatorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole(["admin", "operator"]);
  return children;
}
