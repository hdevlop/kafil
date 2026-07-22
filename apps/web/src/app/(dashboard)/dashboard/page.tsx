import { redirect } from "next/navigation";

import { getRoleHome } from "@/lib/roleRoutes";
import { requireSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireSession();
  redirect(getRoleHome(session.user.role));
}
