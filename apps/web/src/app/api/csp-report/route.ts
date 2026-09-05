import { readBoundedJson, sanitizeCspReports } from "@/lib/cspReports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostics sink for CSP violation reports.
 *
 * Always answers 204, whatever arrived: a violation report is fire-and-forget,
 * and a browser must not be given a reason to retry. Answering identically for
 * a good report, a malformed one, and an oversized one also keeps the endpoint
 * from telling an unauthenticated caller anything about its own limits.
 *
 * This route sits beside the `[...route]` catch-all deliberately — a static
 * segment wins over the catch-all, so reports never reach the Najm server.
 */
export async function POST(request: Request): Promise<Response> {
  const payload = await readBoundedJson(request);

  if (payload !== null) {
    for (const report of sanitizeCspReports(payload)) {
      console.warn("[csp] violation", report);
    }
  }

  return new Response(null, { status: 204 });
}
