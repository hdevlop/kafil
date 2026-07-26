import { NextResponse } from "next/server";

import {
  KAFIL_SUPPORTED_TIME_ZONES,
  normalizeKafilTimeZone,
  type KafilTimeZone,
} from "@/lib/format";

const timeZoneCookieName = "kafil-ui-timezone";

const kafilTimeZoneSet: ReadonlySet<string> = new Set(KAFIL_SUPPORTED_TIME_ZONES);

function isSupportedTimeZone(value: unknown): value is KafilTimeZone {
  return typeof value === "string" && kafilTimeZoneSet.has(value);
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const timeZone = body && typeof body === "object" && "timeZone" in body
    ? (body as { timeZone?: unknown }).timeZone
    : undefined;

  if (!isSupportedTimeZone(timeZone)) {
    return NextResponse.json({ message: "Unsupported time zone." }, { status: 400 });
  }

  const normalized = normalizeKafilTimeZone(timeZone);
  const response = NextResponse.json({ timeZone: normalized });
  response.cookies.set(timeZoneCookieName, normalized, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
