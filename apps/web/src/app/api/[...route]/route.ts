import { server } from "@kafil/server";
import { handle } from "najm-core";
import { withAuthCookiePersistence } from "najm-auth/client/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep the catch-all handler at module scope so a dev rebuild refreshes the
// complete decorated controller registry as one unit.
const serverHandler = handle(server);

export const GET = serverHandler;
// Najm knows its own login, logout, refresh and credential-setup routes, and
// recognizes a setup response without configuration. Only the preference
// cookie name is Kafil's, and renaming it would silently restore persistent
// cookies for a browser still holding `kafil.remember=0`.
export const POST = withAuthCookiePersistence(serverHandler, {
  rememberCookieName: "kafil.remember",
});
export const PUT = serverHandler;
export const PATCH = serverHandler;
export const DELETE = serverHandler;
