import { server } from "@kafil/server";
import { handle } from "najm-core";

import { withAuthCookiePersistence } from "@/lib/authCookiePersistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const serverHandler = handle(server);

export const GET = serverHandler;
export const POST = withAuthCookiePersistence(serverHandler);
export const PUT = serverHandler;
export const PATCH = serverHandler;
export const DELETE = serverHandler;
