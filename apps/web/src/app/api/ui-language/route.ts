import { NextResponse } from "next/server";

import { kafilI18n } from "@kafil/server/locales";

const languageCookieName = "kafil-ui-language";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const language = body && typeof body === "object" && "language" in body
    ? (body as { language?: unknown }).language
    : undefined;

  if (!kafilI18n.isLanguage(language)) {
    return NextResponse.json({ message: "Unsupported language." }, { status: 400 });
  }

  const normalized = kafilI18n.normalizeLanguage(language);
  const response = NextResponse.json({ language: normalized });
  response.cookies.set(languageCookieName, normalized, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
