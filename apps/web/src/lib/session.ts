import "server-only";

import { createReactServerAuth } from "najm-auth/client/server/react";

import { auth } from "./auth";

/**
 * The app's one request-scoped session accessor.
 *
 * Created at module scope on purpose: React keys its `cache()` entry to the
 * memoized function, so the root layout, the dashboard layout, and the page
 * collapse into a single lookup only while they all reach this instance. A
 * factory call inside a component would share nothing.
 *
 * Strictness, redirect targets, role fallback, and error classification belong
 * to `najm-auth` and are configured on `defineAuth()` in `./auth`.
 */
export const serverAuth = createReactServerAuth(auth);

export const { getSession, requireSession, requireRole } = serverAuth;
