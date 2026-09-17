import { auth } from "@/najm.auth";
import { composeNajmProxy } from "najm-next/security";
import { kafilApp } from "@/najm.config";

export default composeNajmProxy({
  auth,
  app: kafilApp,
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:css|js|map|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|webmanifest)$).*)",
  ],
};
