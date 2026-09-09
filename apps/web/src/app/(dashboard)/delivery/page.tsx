import { DeliveryDashboardPage } from "@/features/Dashboard";
import { requireSession } from "@/lib/session";
import { DashboardReturnAction } from "@/shared/DashboardReturnAction";
import { NForbiddenState } from "najm-kit/app";

export const metadata = { title: "Delivery dashboard" };

export default async function DeliveryPage() {
  const session = await requireSession();
  if (session.user.role !== "operator") {
    return <NForbiddenState action={<DashboardReturnAction />} />;
  }
  return <DeliveryDashboardPage />;
}
