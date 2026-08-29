function pathnameOnly(locationUrl: string): string {
  if (!locationUrl) return "none";
  try {
    return new URL(locationUrl).pathname || "/";
  } catch {
    return "invalid";
  }
}

export function consoleErrorFingerprint(text: string, locationUrl: string): string {
  const status = text.match(/status of (\d{3})/i)?.[1] ?? "none";
  const kind = /failed to load resource/i.test(text)
    ? "resource-http"
    : /failed to fetch rsc payload/i.test(text)
      ? "rsc-fetch"
      : /failed to fetch/i.test(text)
        ? "fetch"
        : /hydration failed/i.test(text)
          ? "hydration"
          : /errorboundary/i.test(text)
            ? "error-boundary"
            : "unclassified";
  return `${kind};status=${status};path=${pathnameOnly(locationUrl)}`;
}
