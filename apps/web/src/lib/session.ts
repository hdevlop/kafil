import "server-only";

import type { ServerSession } from "najm-auth/client/server";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "./auth";

export type ProductRole = "operator" | "family" | "sponsor";

/**
 * Request-scoped session lookup.
 *
 * The `cache` wrapper is the part that stays in the application: several server
 * components on one page each ask for the session, and without it each ask is
 * its own cookie verification and possible recovery round trip. It is not in
 * `najm-auth` because `react`'s `cache` only exists from 18.3, and importing
 * `react` inside `defineAuth` would pull it into the edge middleware bundle.
 *
 * The two guards below are built on it rather than on `auth.requireSession` /
 * `auth.requireRole` for that same reason — the framework versions resolve the
 * session themselves, so a page that also called `getSession` would pay for two
 * lookups. The role semantics match `auth.requireRole`.
 */
export const getSession = cache(() => auth.getSession());

export async function requireSession(): Promise<ServerSession> {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

/**
 * Redirects to `/forbidden` when the session holds none of `roles`.
 *
 * Not the login route: the user is already authenticated, so re-authenticating
 * cannot change the answer and would only loop them back here.
 */
export async function requireRole(roles: string[]): Promise<ServerSession> {
  const session = await requireSession();
  // `roles` is authoritative when present; `user.role` is the single-role shape.
  const held = session.roles ?? (session.user.role ? [session.user.role] : []);

  if (!held.some((role) => roles.includes(role))) {
    redirect("/forbidden");
  }

  return session;
}
