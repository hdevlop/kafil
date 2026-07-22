import { NextResponse } from "next/server";

import type { KafilTheme } from "@/providers/ThemePreferenceProvider";

const themeCookieName = "kafil-ui-theme";
const supportedThemes = new Set<KafilTheme>(["light", "dark"]);

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const theme = body && typeof body === "object" && "theme" in body
    ? (body as { theme?: unknown }).theme
    : undefined;

  if (!supportedThemes.has(theme as KafilTheme)) {
    return NextResponse.json({ message: "Unsupported color theme." }, { status: 400 });
  }

  const response = NextResponse.json({ theme });
  response.cookies.set(themeCookieName, theme as KafilTheme, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
