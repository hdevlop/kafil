import {
  AdminDashboardPage,
  FamilyDashboardPage,
  resolveDashboard,
  SponsorDashboardGate,
} from "@/features/Dashboard";
import { requireSession } from "@/lib/session";
import { DashboardReturnAction } from "@/shared/DashboardReturnAction";
import { NForbiddenState } from "najm-kit/app";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession();

  switch (resolveDashboard(session.user.role)) {
    case "admin":
      return <AdminDashboardPage />;
    case "family":
      return <FamilyDashboardPage />;
    case "sponsor":
      return <SponsorDashboardGate />;
    default:
      return <NForbiddenState action={<DashboardReturnAction />} />;
  }
}
