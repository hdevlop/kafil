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
