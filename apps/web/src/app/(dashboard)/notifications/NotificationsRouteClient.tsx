"use client";

import { Suspense } from "react";

import { NotificationsPage } from "@/features/Notifications";

export default function NotificationsRouteClient() {
  return (
    <Suspense fallback={null}>
      <NotificationsPage />
    </Suspense>
  );
}
