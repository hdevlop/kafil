export function getPostLoginRoute(
  nextStep: "authenticated" | "family_password_setup",
  requestedRoute: string,
) {
  if (nextStep === "family_password_setup") return "/change-password";
  return requestedRoute;
}
