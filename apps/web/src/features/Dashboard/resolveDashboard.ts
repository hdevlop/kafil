export type DashboardKind = "admin" | "delivery" | "family" | "sponsor";

export function resolveDashboard(
  role: string | null | undefined,
): DashboardKind | null {
  switch (role) {
    case "admin":
    case "operator":
      return "admin";
    case "delivery":
      return "delivery";
    case "family":
      return "family";
    case "sponsor":
      return "sponsor";
    default:
      return null;
  }
}
