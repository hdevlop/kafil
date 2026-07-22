export function getRoleHome(role: string | null | undefined) {
  switch (role) {
    case "admin":
    case "operator":
      return "/operator";
    case "family":
      return "/family";
    case "sponsor":
      return "/sponsor";
    default:
      return "/forbidden";
  }
}
