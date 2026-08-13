import { NForbiddenState } from "najm-kit/app";

import { DashboardReturnAction } from "@/shared/DashboardReturnAction";

export const metadata = { title: "Access denied" };

export default function ForbiddenPage() {
  return <NForbiddenState action={<DashboardReturnAction />} />;
}
