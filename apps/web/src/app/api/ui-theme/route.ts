import { NextResponse } from "next/server";

import { isKafilTheme, type KafilTheme } from "@/preferences";

const themeCookieName = "kafil-ui-theme";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const theme = body && typeof body === "object" && "theme" in body
    ? (body as { theme?: unknown }).theme
    : undefined;

  if (!isKafilTheme(theme)) {
    return NextResponse.json({ message: "Unsupported color theme." }, { status: 400 });
  }

  const response = NextResponse.json({ theme });
  response.cookies.set(themeCookieName, theme satisfies KafilTheme, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
