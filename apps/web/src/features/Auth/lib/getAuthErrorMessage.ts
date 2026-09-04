export function getAuthErrorMessage(
  error: unknown,
  fallback = "The request could not be completed.",
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const value = error as {
      body?: { message?: string };
      response?: { data?: { message?: string } };
    };

    return value.body?.message ?? value.response?.data?.message ?? fallback;
  }

  return fallback;
}

export function getOAuthFlowErrorMessage(value: unknown, providerValue?: unknown) {
  const code = Array.isArray(value) ? value[0] : value;
  if (typeof code !== "string") return undefined;
  const provider = Array.isArray(providerValue) ? providerValue[0] : providerValue;
  const name = provider === "github" ? "GitHub" : "Google";
  const messages: Readonly<Record<string, string>> = {
    oauth_access_denied: `${name} sign-in was cancelled.`,
    oauth_account_inactive: "This Kafil account is not active yet.",
    oauth_account_link_required: `This email must be linked to ${name} from account settings first.`,
    oauth_hosted_domain_denied: "This Google account is not allowed to sign in here.",
    oauth_provider_disabled: `${name} sign-in is not configured.`,
    oauth_provider_error: `${name} could not complete the sign-in. Please try again.`,
    oauth_signup_disabled: "No active Kafil account uses this email. Create your sponsor account first.",
    oauth_state_invalid: `The ${name} sign-in request expired. Please try again.`,
    oauth_verified_email_required: `${name} requires a verified primary email.`,
  };
  return messages[code];
}
