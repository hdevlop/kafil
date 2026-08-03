"use client";

import type { ReactNode } from "react";

import { useKafilRole, type KafilExactRole } from "./useKafilRole";

const INHERITED_PRESENTATION_ROLES: ReadonlySet<KafilExactRole> = new Set([
  "operator",
  "family",
  "sponsor",
]);

function rolesFor(value: KafilExactRole | KafilExactRole[]): KafilExactRole[] {
  return Array.isArray(value) ? value : [value];
}

function evaluate(
  presentation: KafilExactRole | KafilExactRole[] | undefined,
  exact: KafilExactRole,
) {
  if (!presentation) return false;
  const requested = rolesFor(presentation).filter(
    (role): role is KafilExactRole => role !== null,
  );

  if (requested.length === 0) return false;

  return requested.some((role) => {
    if (INHERITED_PRESENTATION_ROLES.has(role)) {
      return exact === role || exact === "admin";
    }
    return exact === role;
  });
}

export interface RoleProps {
  is?: KafilExactRole;
  any?: KafilExactRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function Role({
  is,
  any,
  children,
  fallback = null,
}: Readonly<RoleProps>) {
  const { exact } = useKafilRole();
  const presentation = is ?? any;
  const allowed = evaluate(presentation, exact);

  return <>{allowed ? children : fallback}</>;
}

export interface AdminProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function Admin({ children, fallback = null }: Readonly<AdminProps>) {
  return (
    <Role is="admin" fallback={fallback}>
      {children}
    </Role>
  );
}

export interface OperatorProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function Operator({
  children,
  fallback = null,
}: Readonly<OperatorProps>) {
  return (
    <Role is="operator" fallback={fallback}>
      {children}
    </Role>
  );
}

export interface FamilyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function Family({ children, fallback = null }: Readonly<FamilyProps>) {
  return (
    <Role is="family" fallback={fallback}>
      {children}
    </Role>
  );
}

export interface SponsorProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function Sponsor({ children, fallback = null }: Readonly<SponsorProps>) {
  return (
    <Role is="sponsor" fallback={fallback}>
      {children}
    </Role>
  );
}

export type OnlySponsorProps = SponsorProps;

export function OnlySponsor({
  children,
  fallback = null,
}: Readonly<OnlySponsorProps>) {
  const { isExactSponsor } = useKafilRole();

  return <>{isExactSponsor ? children : fallback}</>;
}
