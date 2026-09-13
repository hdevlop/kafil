import { defineNajmApp } from "najm-next/app";
import { defineNajmLocationRuntime } from "najm-next/location/server";

export const kafilApp = defineNajmApp({
  id: "kafil",
  auth: {
    apiBaseURL: "/api",
    authPrefix: "/auth",
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
      "/delivery",
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
      "/notifications",
    ],
    roleRoutes: {
      "/operator/:path*": ["admin", "operator"],
      "/delivery": ["delivery"],
      "/family": ["admin", "operator", "sponsor", "delivery"],
      "/family/:path*": ["family"],
      "/children": ["admin", "operator", "family"],
      "/sponsor/:path*": ["sponsor"],
      "/products": ["admin", "operator", "family"],
      "/categories": ["admin", "operator", "family"],
      "/orders": ["admin", "operator", "family", "sponsor"],
      "/contribution": ["admin", "operator", "family", "sponsor"],
      "/applicants": ["admin"],
      "/notifications": ["admin", "operator", "family", "sponsor"],
    },
    loginRoute: "/login",
    forbiddenRoute: "/forbidden",
    proxySessionMode: "optimistic",
    rememberCookieName: "kafil.remember",
    refreshThreshold: 0.8,
    tabSync: true,
  },
  preferences: {
    cookieNames: {
      language: "kafil-ui-language",
      theme: "kafil-ui-theme",
      timeZone: "kafil-ui-timezone",
    },
    defaultTimeZone: "Africa/Casablanca",
  },
  csp: {
    reportPath: "/api/csp-report",
    extraImgSrc: ["https://cdnjs.cloudflare.com"],
    frameSrc: ["'none'"],
  },
  location: { environmentPrefix: "KAFIL_LOCATION" },
});

export const kafilLocation = defineNajmLocationRuntime({
  environmentPrefix: kafilApp.location.environmentPrefix,
  allowedProviders: ["leaflet"],
  defaults: {
    provider: "leaflet",
    center: { latitude: 33.5731, longitude: -7.5898 },
    zoom: 12,
    leaflet: {
      tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
});
