export function getPostLoginRoute(
  nextStep: "authenticated" | "family_password_setup" | "sponsor_email_otp",
  requestedRoute: string,
) {
  if (nextStep === "family_password_setup") return "/change-password";
  if (nextStep === "sponsor_email_otp") return "/verify-email";
  return requestedRoute;
}
