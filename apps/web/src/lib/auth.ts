import { defineAuth } from "najm-auth/client/server";

export const auth = defineAuth({
  apiBaseURL: "/api",
  authPrefix: "/auth",
  afterLoginRoute: "/dashboard",
  loginRoute: "/login",
  publicRoutes: [
    "/",
    "/login",
    "/register/sponsor",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ],
  protectedRoutes: [
    "/change-password",
    "/dashboard",
    "/forbidden",
    "/operator/:path*",
    "/family/:path*",
    "/sponsor/:path*",
    "/products",
    "/categories",
    "/orders",
  ],
  roleRoutes: {
    "/operator/:path*": ["admin", "operator"],
    "/family/:path*": ["family"],
    "/sponsor/:path*": ["sponsor"],
    "/products": ["admin", "operator", "family"],
    "/categories": ["admin", "operator", "family"],
    "/orders": ["admin", "operator", "family"],
  },
  refreshThreshold: 0.8,
  tabSync: true,
  verifyAlways: true,
});
