import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

function hasRefreshToken(request: Request) {
  return /(?:^|;\s*)refreshToken=/.test(request.headers.get("cookie") ?? "");
}

function isSpeculativePrefetch(request: Request) {
  const headers = request.headers;
  const routerState = headers.get("next-router-state-tree") ?? "";

  return (
    headers.get("next-router-prefetch") === "1" ||
    headers.get("purpose") === "prefetch" ||
    headers.get("sec-purpose")?.includes("prefetch") ||
    routerState.includes("metadata-only")
  );
}

export default async function proxy(request: Request) {
  if (hasRefreshToken(request) && isSpeculativePrefetch(request)) {
    return NextResponse.next();
  }

  return auth.middleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:css|js|map|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|webmanifest)$).*)",
  ],
};
