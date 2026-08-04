import "server-only";

import type { ServerSession } from "najm-auth/client/server";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "./auth";

export type ProductRole = "operator" | "family" | "sponsor";

export const getSession = cache(() => auth.getSession());

export async function requireSession(): Promise<ServerSession> {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(roles: string[]): Promise<ServerSession> {
  const session = await requireSession();
  const role = session.user.role;

  if (!role || !roles.includes(role)) {
    redirect("/forbidden");
  }

  return session;
}
