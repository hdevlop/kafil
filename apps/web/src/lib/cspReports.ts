/**
 * Sink for CSP violation reports.
 *
 * A reporting policy is only useful if somebody can read what it finds. This
 * turns browser reports into one bounded, sanitized log line per violation.
 *
 * Everything here is written on the assumption that the body is attacker
 * controlled: any origin can POST to this endpoint, and a real report from a
 * real browser can still carry a URL with a session token in its query string.
 * So the body is size-capped before parsing, only known fields are read, each
 * is truncated, and URLs are reduced to origin plus path — never the query or
 * fragment.
 */

/** Reports are small; anything larger is not a report we want to parse. */
const MAX_BODY_BYTES = 8_192;
const MAX_FIELD_LENGTH = 256;

/** The fields worth acting on. Everything else in a report is discarded. */
export interface SanitizedCspReport {
  documentUri: string;
  violatedDirective: string;
  effectiveDirective: string;
  blockedUri: string;
  disposition: string;
  statusCode: string;
}

const truncate = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "";
  return value.length > MAX_FIELD_LENGTH ? `${value.slice(0, MAX_FIELD_LENGTH)}…` : value;
};

/**
 * Reduce a reported URL to the part that identifies *what* was blocked.
 *
 * A document URI routinely carries query parameters — a reset token, a return
 * path, an invite link — and a violation report would otherwise copy them into
 * the logs verbatim. Keywords CSP uses in place of a URL (`inline`, `eval`,
 * `self`) are kept as-is because they carry no data.
 */
const sanitizeUri = (value: unknown): string => {
  const raw = truncate(value);
  if (!raw) return "";
  if (!raw.includes("://")) return raw.split("?")[0];

  try {
    const url = new URL(raw);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "unparseable";
  }
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * Accept both report shapes: the legacy `application/csp-report` envelope and
 * the Reporting API's `application/reports+json` batch.
 */
export function sanitizeCspReports(payload: unknown): SanitizedCspReport[] {
  const entries = Array.isArray(payload)
    ? payload.map((entry) => asRecord(asRecord(entry).body))
    : [asRecord(asRecord(payload)["csp-report"])];

  return entries
    .map((entry) => ({
      documentUri: sanitizeUri(entry["document-uri"] ?? entry.documentURL),
      violatedDirective: truncate(entry["violated-directive"] ?? entry.violatedDirective),
      effectiveDirective: truncate(entry["effective-directive"] ?? entry.effectiveDirective),
      blockedUri: sanitizeUri(entry["blocked-uri"] ?? entry.blockedURL),
      disposition: truncate(entry.disposition),
      statusCode: truncate(String(entry["status-code"] ?? entry.statusCode ?? "")),
    }))
    .filter((report) => report.effectiveDirective || report.violatedDirective || report.blockedUri);
}

/**
 * Read a bounded body. Returns null rather than throwing so the handler can
 * answer 204 either way — a violation report is fire-and-forget, and telling a
 * caller how their payload was rejected is free reconnaissance.
 *
 * The cap bounds the *read*, not just the result. `arrayBuffer()` would buffer
 * whatever the client sent before the size could be examined, so a sender that
 * simply omits `Content-Length` — trivial with a chunked or streamed body —
 * could make this endpoint hold megabytes despite an 8 KiB limit. Instead the
 * stream is consumed chunk by chunk and cancelled the moment the running total
 * exceeds the cap, so the peak held is one chunk beyond it.
 *
 * `Content-Length`, when present and already too large, still short-circuits
 * before a single byte is read. It is an optimisation, never the enforcement.
 */
export async function readBoundedJson(request: Request): Promise<unknown | null> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;

  const body = request.body;
  if (!body) return null;

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }

  try {
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(joined));
  } catch {
    return null;
  }
}
