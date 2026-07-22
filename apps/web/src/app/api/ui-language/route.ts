import { NextResponse } from "next/server";

import { normalizeKafilLanguage } from "@/lib/format";

const languageCookieName = "kafil-ui-language";
const supportedLanguages = new Set(["en", "fr", "ar"]);

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const language = body && typeof body === "object" && "language" in body
    ? (body as { language?: unknown }).language
    : undefined;

  if (!supportedLanguages.has(String(language))) {
    return NextResponse.json({ message: "Unsupported language." }, { status: 400 });
  }

  const response = NextResponse.json({ language: normalizeKafilLanguage(language) });
  response.cookies.set(languageCookieName, normalizeKafilLanguage(language), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
