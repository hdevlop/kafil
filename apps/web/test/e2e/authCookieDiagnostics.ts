import type { Page, Response } from "@playwright/test";

export type AuthCookieKind = "access" | "refresh" | "session";
export type SessionCookieAction = "delete" | "set";

export interface AuthCookieScope {
  kind: AuthCookieKind;
  domain: string;
  path: string;
}

export interface SessionCookieDirective {
  action: SessionCookieAction;
  domain: string;
  path: string;
}

export interface AuthCookieWriterEvent {
  order: number;
  method: string;
  path: string;
  status: number;
  sessionAction: SessionCookieAction;
  sessionDomain: string;
  sessionPath: string;
}

interface CookieLike {
  name: string;
  value: string;
  domain: string;
  path: string;
}

interface AuthCookieWriterRecorder {
  stop(): Promise<AuthCookieWriterEvent[]>;
}

function cookieAttribute(parts: string[], name: string): string | undefined {
  const prefix = `${name.toLowerCase()}=`;
  const attribute = parts.find((part) => part.toLowerCase().startsWith(prefix));
  return attribute?.slice(attribute.indexOf("=") + 1).trim() || undefined;
}

function isDeletion(value: string, attributes: string[]): boolean {
  if (value === "") return true;

  const maxAge = cookieAttribute(attributes, "max-age");
  if (maxAge !== undefined && Number(maxAge) <= 0) return true;

  const expires = cookieAttribute(attributes, "expires");
  if (!expires) return false;
  const expiresAt = new Date(expires).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

export function inspectSessionCookieHeaders(
  setCookieHeaders: readonly string[],
): SessionCookieDirective[] {
  return setCookieHeaders.flatMap((header) => {
    const [nameValue = "", ...attributes] = header.split(";").map((part) => part.trim());
    const separator = nameValue.indexOf("=");
    if (separator < 0) return [];

    const name = nameValue.slice(0, separator).trim();
    if (!/^najm\.session$/i.test(name)) return [];

    const value = nameValue.slice(separator + 1);
    return [{
      action: isDeletion(value, attributes) ? "delete" : "set",
      domain: cookieAttribute(attributes, "domain") ?? "host-only",
      path: cookieAttribute(attributes, "path") ?? "default",
    } satisfies SessionCookieDirective];
  });
}

export function describeRecognizedAuthCookies(
  cookies: readonly CookieLike[],
): AuthCookieScope[] {
  return cookies.flatMap((cookie) => {
    let kind: AuthCookieKind | undefined;
    if (/^accessToken$/i.test(cookie.name)) kind = "access";
    if (/^refreshToken$/i.test(cookie.name)) kind = "refresh";
    if (/^najm\.session$/i.test(cookie.name)) kind = "session";
    if (!kind) return [];
    return [{ kind, domain: cookie.domain, path: cookie.path }];
  });
}

export function recordAuthCookieWriters(...pages: Page[]): AuthCookieWriterRecorder {
  const events: AuthCookieWriterEvent[] = [];
  const pending = new Set<Promise<void>>();
  let nextOrder = 0;

  const observe = (response: Response): void => {
    const order = nextOrder + 1;
    nextOrder = order;
    const task = (async () => {
      const headers = await response.headersArray();
      const directives = inspectSessionCookieHeaders(
        headers
          .filter((header) => header.name.toLowerCase() === "set-cookie")
          .map((header) => header.value),
      );
      if (directives.length === 0) return;

      const url = new URL(response.url());
      for (const directive of directives) {
        events.push({
          order,
          method: response.request().method(),
          path: url.pathname,
          status: response.status(),
          sessionAction: directive.action,
          sessionDomain: directive.domain,
          sessionPath: directive.path,
        });
      }
    })();
    pending.add(task);
    void task.finally(() => pending.delete(task));
  };

  for (const page of pages) page.on("response", observe);
  return {
    async stop() {
      for (const page of pages) page.off("response", observe);
      await Promise.all([...pending]);
      return events.sort((left, right) => left.order - right.order);
    },
  };
}
