import { AuthGuard, RoleGuard } from "najm-auth";
import { getGuardMetadata } from "najm-guard";

/** The role sets Kafil's route guards admit, sorted, as authConfig declares them. */
export const ROLE_SET = {
  admin: ["admin"],
  operator: ["admin", "operator"],
  delivery: ["delivery"],
  family: ["admin", "family"],
  sponsor: ["admin", "sponsor"],
  notificationReader: ["admin", "delivery", "family", "operator", "sponsor"],
  contributionReader: ["admin", "operator", "sponsor"],
  childReader: ["admin", "family", "operator"],
  orderReader: ["admin", "family", "operator", "sponsor"],
  sponsorImage: ["admin", "operator", "sponsor"],
  childImageViewer: ["admin", "family", "operator", "sponsor"],
} satisfies Record<string, string[]>;

/**
 * The roles a route's role guard admits, sorted, or `undefined` when the route
 * has no role guard. A role guard without a sign-in guard beside it is an
 * error: every Kafil role guard requires an authenticated principal.
 */
export function routeRoles(target: object, method: string): string[] | undefined {
  const guards = getGuardMetadata(target as never, method);
  const role = guards.find((guard) => guard.guardClass === RoleGuard);
  if (!role) return undefined;
  if (!guards.some((guard) => guard.guardClass === AuthGuard)) {
    throw new Error(`${method} has a role guard without a sign-in guard`);
  }
  const params = role.params as string | string[];
  return [...(Array.isArray(params) ? params : [params])].sort();
}
