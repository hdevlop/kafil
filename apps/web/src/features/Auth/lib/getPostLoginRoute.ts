export function getPostLoginRoute(
  nextStep: "authenticated" | "credential_setup",
  requestedRoute: string,
) {
  if (nextStep === "credential_setup") return "/change-password";
  return requestedRoute;
}
