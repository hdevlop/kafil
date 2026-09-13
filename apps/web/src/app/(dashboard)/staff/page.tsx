import { StaffPage } from "@/features/Staff";
import { requireRole } from "@/najm.server";

export const metadata = { title: "Staff" };

export default async function StaffRoutePage() {
  await requireRole(["admin"]);
  return <StaffPage />;
}
