import { NextResponse } from "next/server";

import { normalizeKafilLanguage } from "@/preferences";

const languageCookieName = "kafil-ui-language";
const supportedLanguages = ["en", "fr", "ar", "es"] as const;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const language = body && typeof body === "object" && "language" in body
    ? (body as { language?: unknown }).language
    : undefined;

  if (typeof language !== "string" || !(supportedLanguages as readonly string[]).includes(language)) {
    return NextResponse.json({ message: "Unsupported language." }, { status: 400 });
  }

  const normalized = normalizeKafilLanguage(language);
  const response = NextResponse.json({ language: normalized });
  response.cookies.set(languageCookieName, normalized, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
