import { defineAuth } from "najm-auth/client/server";

export const auth = defineAuth({
  apiBaseURL: "/api",
  authPrefix: "/auth",
  afterLoginRoute: "/dashboard",
  loginRoute: "/login",
  forbiddenRoute: "/forbidden",
  publicRoutes: [
    "/",
    "/apply",
    "/change-password",
    "/auth/oauth/callback",
    "/login",
    "/forgot-password",
    "/reset-password",
  ],
  protectedRoutes: [
    "/dashboard",
    "/forbidden",
    "/operator/:path*",
    "/family/:path*",
    "/sponsor/:path*",
    "/products",
    "/categories",
    "/orders",
    "/contribution",
    "/family",
    "/children",
    "/applicants",
  ],
  roleRoutes: {
    "/operator/:path*": ["admin", "operator"],
    "/family": ["admin", "operator", "sponsor"],
    "/family/:path*": ["family"],
    "/children": ["admin", "operator", "family"],
    "/sponsor/:path*": ["sponsor"],
    "/products": ["admin", "operator", "family"],
    "/categories": ["admin", "operator", "family"],
    "/orders": ["admin", "operator", "family", "sponsor"],
    "/contribution": ["admin", "operator", "family", "sponsor"],
    "/applicants": ["admin"],
  },
  refreshThreshold: 0.8,
  tabSync: true,
  // Proxy is an optimistic routing boundary. Revalidating every otherwise
  // valid signed snapshot makes every protected page response a potential
  // `najm.session` writer, including a response that began before logout and
  // arrives after the logout deletion. API authorization remains authoritative,
  // and a missing or expired snapshot still uses Najm's recovery path.
  proxySessionMode: "optimistic",
});
