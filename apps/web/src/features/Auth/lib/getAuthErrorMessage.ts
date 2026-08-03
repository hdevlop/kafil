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

const oauthErrorMessages: Readonly<Record<string, string>> = {
  oauth_access_denied: "Google sign-in was cancelled.",
  oauth_account_inactive: "This Kafil account is not active yet.",
  oauth_account_link_required: "This email must be linked to Google from account settings first.",
  oauth_hosted_domain_denied: "This Google account is not allowed to sign in here.",
  oauth_provider_disabled: "Google sign-in is not configured.",
  oauth_provider_error: "Google could not complete the sign-in. Please try again.",
  oauth_signup_disabled: "No active Kafil account uses this email. Create your sponsor account first.",
  oauth_state_invalid: "The Google sign-in request expired. Please try again.",
};

export function getOAuthFlowErrorMessage(value: unknown) {
  const code = Array.isArray(value) ? value[0] : value;
  return typeof code === "string" ? oauthErrorMessages[code] : undefined;
}
