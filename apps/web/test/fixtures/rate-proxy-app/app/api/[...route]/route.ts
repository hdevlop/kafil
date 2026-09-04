import { handle } from "najm-core";

import { rateProxyAcceptanceServer } from "../../server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = handle(rateProxyAcceptanceServer);

export const GET = handler;
