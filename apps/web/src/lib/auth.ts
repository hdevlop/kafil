import { defineAuth } from "najm-auth/client/server";

export const auth = defineAuth({
  apiBaseURL: "/api",
  authPrefix: "/auth",
  afterLoginRoute: "/dashboard",
  loginRoute: "/login",
  // Explicit because `requireRole()` now redirects here from the package rather
  // than from a literal in session.ts.
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
  verifyAlways: true,
});
