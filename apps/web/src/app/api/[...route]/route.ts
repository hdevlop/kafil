import { server } from "@kafil/server";
import { handle } from "najm-core";
import { auth } from "@/najm.auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep the catch-all handler at module scope so a dev rebuild refreshes the
// complete decorated controller registry as one unit.
const serverHandler = handle(server);

const handlers = auth.routeHandlers(serverHandler);
export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = handlers;
