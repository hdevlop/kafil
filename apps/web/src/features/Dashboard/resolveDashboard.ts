export type DashboardKind = "admin" | "family" | "sponsor";

export function resolveDashboard(
  role: string | null | undefined,
): DashboardKind | null {
  switch (role) {
    case "admin":
    case "operator":
      return "admin";
    case "family":
      return "family";
    case "sponsor":
      return "sponsor";
    default:
      return null;
  }
}
