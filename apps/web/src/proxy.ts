import { auth } from "@/lib/auth";

export default async function proxy(request: Request) {
  return auth.proxy(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:css|js|map|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|webmanifest)$).*)",
  ],
};
