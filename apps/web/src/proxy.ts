import { auth } from "@/lib/auth";
import { createContentSecurityPolicy, createCspNonce } from "@/lib/contentSecurityPolicy";

export default async function proxy(request: Request) {
  const nonce = createCspNonce();
  const policy = createContentSecurityPolicy(nonce);
  const response = await auth.proxy(request, {
    requestHeaders: {
      "content-security-policy": policy,
      "x-nonce": nonce,
    },
  });

  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:css|js|map|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|webmanifest)$).*)",
  ],
};
