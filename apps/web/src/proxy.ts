import { auth } from "@/lib/auth";
import { composeNajmProxy } from "najm-next/security";
import { kafilApp, kafilLocation } from "@/najm.config";

export default composeNajmProxy({
  auth,
  app: kafilApp,
  resolveLocationCsp: (env) =>
    kafilLocation.resolve(env, {
      isDevelopment: env.NODE_ENV === "development",
    }).csp,
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:css|js|map|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|webmanifest)$).*)",
  ],
};
