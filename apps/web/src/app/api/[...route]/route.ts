import { server } from "@kafil/server";
import { handle } from "najm-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(server);
export const POST = handle(server);
export const PUT = handle(server);
export const PATCH = handle(server);
export const DELETE = handle(server);
