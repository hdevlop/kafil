import { withAuthCookiePersistence as withNajmAuthCookiePersistence } from "najm-auth/client/server";

type RequestHandler = (request: Request) => Promise<Response>;

/**
 * "Remember me" for the auth cookies, from `najm-auth`, wired to Kafil's routes.
 *
 * The cookie rewriting itself is the framework's. What is Kafil's is the route
 * list — the `/api/access/*` flows sit alongside the standard `/api/auth/*`
 * ones — and the two shapes a response takes when credentials must still be set
 * up before a session is usable.
 *
 * The preference cookie keeps its `kafil.remember` name rather than taking the
 * framework default, so a browser that already holds one is not silently
 * reset to "not remembered" on the next refresh.
 */
export function withAuthCookiePersistence(handler: RequestHandler): RequestHandler {
  return withNajmAuthCookiePersistence(handler, {
    rememberCookieName: "kafil.remember",
    loginPaths: ["/api/auth/login", "/api/access/login"],
    logoutPaths: ["/api/auth/logout", "/api/access/family-password/change"],
    refreshPaths: ["/api/auth/refresh", "/api/auth/session/recover"],
    isSetupResponse: (payload) => {
      // Some endpoints answer with the flow at the top level, others nest it
      // under `data`.
      const envelope = payload as {
        data?: { nextStep?: unknown; setupRequired?: unknown };
        nextStep?: unknown;
        setupRequired?: unknown;
      } | null;
      const flow = envelope?.data ?? envelope;

      return (
        flow?.setupRequired === true ||
        flow?.nextStep === "family_password_setup"
      );
    },
  });
}

export { makeSessionCookie } from "najm-auth/client/server";
