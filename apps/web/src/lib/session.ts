import "server-only";

import { createReactServerAuth } from "najm-auth/client/server/react";
import { auth } from "./auth";

export const serverAuth = createReactServerAuth(auth);
export const { getSession, requireSession, requireRole } = serverAuth;
