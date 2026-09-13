import { defineAuth } from "najm-auth/client/server";

import { kafilApp } from "@/najm.config";

const roleRoutes = Object.fromEntries(
  Object.entries(kafilApp.auth.roleRoutes ?? {}).map(([route, roles]) => [
    route,
    [...roles],
  ]),
);

export const auth = defineAuth({
  apiBaseURL: kafilApp.auth.apiBaseURL,
  authPrefix: kafilApp.auth.authPrefix,
  afterLoginRoute: "/dashboard",
  loginRoute: kafilApp.auth.loginRoute,
  forbiddenRoute: kafilApp.auth.forbiddenRoute,
  publicRoutes: [...kafilApp.auth.publicRoutes],
  protectedRoutes: [...kafilApp.auth.protectedRoutes],
  roleRoutes,
  refreshThreshold: kafilApp.auth.refreshThreshold,
  tabSync: kafilApp.auth.tabSync,
  // Proxy is an optimistic routing boundary. API authorization remains
  // authoritative, while a missing or expired snapshot still uses Najm's
  // recovery path without letting an older response resurrect a logout.
  proxySessionMode: kafilApp.auth.proxySessionMode,
});
