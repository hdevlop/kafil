import { server } from "@kafil/server";
import { handle } from "najm-core";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep the catch-all handler at module scope so a dev rebuild refreshes the
// complete decorated controller registry as one unit.
const serverHandler = handle(server);

// Najm knows its own login, logout, refresh and credential-setup routes, and
// recognizes a setup response without configuration. Only the preference
// cookie name is Kafil's, and renaming it would silently restore persistent
// cookies for a browser still holding `kafil.remember=0`.
const handlers = auth.routeHandlers(serverHandler, {
  rememberCookieName: "kafil.remember",
});
export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = handlers;
