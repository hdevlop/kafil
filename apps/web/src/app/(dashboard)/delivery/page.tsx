import { DeliveryDashboardPage } from "@/features/Dashboard";
import { requireSession } from "@/najm.server";
import { DashboardReturnAction } from "@/shared/DashboardReturnAction";
import { NForbiddenState } from "najm-kit/app";

export const metadata = { title: "Delivery dashboard" };

export default async function DeliveryPage() {
  const session = await requireSession();
  if (
    session.user.role !== "operator" &&
    session.user.role !== "delivery"
  ) {
    return <NForbiddenState action={<DashboardReturnAction />} />;
  }
  return <DeliveryDashboardPage />;
}
