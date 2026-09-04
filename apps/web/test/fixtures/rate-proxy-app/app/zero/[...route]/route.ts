import { handle } from "najm-core";

import { zeroHopAcceptanceServer } from "../../server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = handle(zeroHopAcceptanceServer);

export const GET = handler;
