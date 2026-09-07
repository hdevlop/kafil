import type { Metadata } from "next";

import NotificationsRouteClient from "./NotificationsRouteClient";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsRoutePage() {
  return <NotificationsRouteClient />;
}
