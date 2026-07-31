import { requireRole } from "@/lib/session";

import { StaffPage } from "@/features/Staff";

export default async function StaffRoute() {
  await requireRole(["admin"]);
  return <StaffPage />;
}