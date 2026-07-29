"use client";

import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useMemo,
} from "react";
import { useUser } from "najm-auth/client/react";

export type KafilExactRole = "admin" | "operator" | "family" | "sponsor" | null;

const KAFIL_ROLES = ["admin", "operator", "family", "sponsor"] as const;
const KafilRoleContext = createContext<KafilExactRole | undefined>(undefined);

function normalize(role: string | null | undefined): KafilExactRole {
  if (!role) return null;
  return (KAFIL_ROLES as readonly string[]).includes(role)
    ? (role as KafilExactRole)
    : null;
}

export function useKafilRole() {
  const user = useUser();
  const serverRole = useContext(KafilRoleContext);
  const exact = serverRole === undefined ? normalize(user?.role) : serverRole;

  return useMemo(
    () => ({
      exact,
      isExactAdmin: exact === "admin",
      isExactOperator: exact === "operator",
      isExactFamily: exact === "family",
      isExactSponsor: exact === "sponsor",
      isExactly(role: KafilExactRole) {
        return exact === role;
      },
    }),
    [exact],
  );
}

export function KafilRoleProvider({
  children,
  role,
}: Readonly<{ children: ReactNode; role: string | null | undefined }>) {
  const exact = normalize(role);
  return createElement(KafilRoleContext.Provider, { value: exact }, children);
}
