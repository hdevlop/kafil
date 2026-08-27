const LOGOUT_PATH = "/api/auth/logout";
const AUTH_COOKIE_NAMES = ["refreshToken", "najm.session"] as const;

function deletionCookie(name: string, secure: boolean): string {
  return [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
  ].join("; ");
}

export function ensureLogoutCookiesCleared(
  request: Request,
  response: Response,
): Response {
  if (!response.ok || new URL(request.url).pathname !== LOGOUT_PATH) {
    return response;
  }

  const headers = new Headers(response.headers);
  const secure = new URL(request.url).protocol === "https:";
  for (const name of AUTH_COOKIE_NAMES) {
    headers.append("set-cookie", deletionCookie(name, secure));
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
