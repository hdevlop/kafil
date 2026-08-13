import { NNotFoundState } from "najm-kit/app";

import { DashboardReturnAction } from "@/shared/DashboardReturnAction";

export default function NotFound() {
  return <NNotFoundState action={<DashboardReturnAction />} />;
}
