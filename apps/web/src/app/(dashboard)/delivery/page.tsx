import { requireSession } from "@/najm.server";
import { DashboardReturnAction } from "@/shared/DashboardReturnAction";
import { NForbiddenState } from "najm-kit/app";
import { redirect } from "next/navigation";

export const metadata = { title: "Delivery dashboard" };

export default async function DeliveryPage() {
  const session = await requireSession();
  if (session.user.role !== "delivery") {
    return <NForbiddenState action={<DashboardReturnAction />} />;
  }
  redirect("/dashboard");
}
