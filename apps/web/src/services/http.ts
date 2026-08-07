"use client";

// The directive above is load-bearing. `auth.api` takes its bearer token from
// `auth.client`'s state, which on the server is a per-process client najm-auth
// deliberately leaves unhydrated — a call from a server component would go out
// unauthenticated.

import { auth } from "@/lib/auth";

export type QueryValue = boolean | number | string | null | undefined;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
}

interface ApiResponseEnvelope<T> {
  data: T;
  message?: string;
  status: "success";
}

interface PaginatedResponseEnvelope<T> extends ApiResponseEnvelope<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * One page of a list endpoint, plus how many rows match in total.
 *
 * `total` is `null` for an endpoint that does not report one. Callers must
 * treat that as "unknown", never as zero — a numbered page control has nothing
 * honest to show without it.
 */
export interface ApiPage<T> {
  rows: T[];
  total: number | null;
}

let pendingAccessTokenRefresh: Promise<void> | null = null;

export function unwrapApiResponse<T>(response: T | ApiResponseEnvelope<T>): T {
  if (
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    "status" in response &&
    response.status === "success"
  ) {
    return response.data;
  }

  return response as T;
}

/**
 * Read the result total najm-core's `paginated()` puts beside `data`.
 *
 * Returns `null` rather than throwing for a list that has not been migrated to
 * the envelope, so a single reader serves both.
 */
function readTotal(response: unknown): number | null {
  if (typeof response !== "object" || response === null) return null;
  if (!("pagination" in response)) return null;
  const { pagination } = response as PaginatedResponseEnvelope<unknown>;
  return typeof pagination?.total === "number" ? pagination.total : null;
}

export function buildApiPath(
  path: string,
  query?: Record<string, QueryValue>,
) {
  if (!query) return path;

  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const queryString = search.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function ensureAccessToken(
  method: "delete" | "get" | "patch" | "post" | "put",
  path: string,
) {
  const isPublicAccessPath = [
    "/access/login",
    "/access/family-password/setup",
    "/access/family-password/change",
    "/access/family-password/cancel",
    "/applicants/email-verification/setup",
    "/applicants/email-verification/status",
    "/applicants/email-verification/resend",
    "/applicants/email-verification/confirm",
  ].includes(path);
  const isPublicApplicantSubmission = method === "post" && path === "/applicants";
  if (path.startsWith("/auth/") || isPublicAccessPath || isPublicApplicantSubmission) return;

  const state = auth.client.getState();
  if (!state.isAuthenticated || state.accessToken) return;

  pendingAccessTokenRefresh ??= auth.client.refresh().finally(() => {
    pendingAccessTokenRefresh = null;
  });

  await pendingAccessTokenRefresh;
}

async function binaryRequest<T = void>(
  method: "DELETE" | "POST",
  path: string,
  body?: Blob,
  retried = false,
) {
  await ensureAccessToken(method === "DELETE" ? "delete" : "post", path);

  const token = auth.client.getState().accessToken;
  const response = await fetch(`/api${path}`, {
    method,
    body,
    credentials: "include",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body?.type ? { "content-type": body.type } : {}),
    },
  });

  if (response.status === 401 && !retried) {
    await auth.client.refresh();
    return binaryRequest<T>(method, path, body, true);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message ?? `File request failed (${response.status})`);
  }

  const payload = (await response.json().catch(() => undefined)) as
    | T
    | ApiResponseEnvelope<T>
    | undefined;
  return payload === undefined ? (undefined as T) : unwrapApiResponse(payload);
}

async function request<T>(
  method: "delete" | "get" | "patch" | "post" | "put",
  path: string,
  body?: unknown,
) {
  await ensureAccessToken(method, path);

  if (method === "get") {
    return unwrapApiResponse(await auth.api.get<T | ApiResponseEnvelope<T>>(path));
  }

  const options = body === undefined ? undefined : { body };
  return unwrapApiResponse(
    await auth.api[method]<T | ApiResponseEnvelope<T>>(path, options),
  );
}

/**
 * GET one page of a list, keeping the envelope's result total.
 *
 * `api.get` discards everything but `data`, which is why the total needs its
 * own reader rather than a flag on the existing one.
 */
async function pageRequest<T>(path: string): Promise<ApiPage<T>> {
  await ensureAccessToken("get", path);

  const response = await auth.api.get<T[] | PaginatedResponseEnvelope<T[]>>(path);
  return {
    rows: unwrapApiResponse(response),
    total: readTotal(response),
  };
}

export const api = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>("get", buildApiPath(path, options?.query));
  },
  getPage<T>(path: string, options?: RequestOptions) {
    return pageRequest<T>(buildApiPath(path, options?.query));
  },
  post<T>(path: string, body?: unknown) {
    return request<T>("post", path, body);
  },
  put<T>(path: string, body?: unknown) {
    return request<T>("put", path, body);
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>("patch", path, body);
  },
  delete<T>(path: string, body?: unknown) {
    return request<T>("delete", path, body);
  },
  upload<T = void>(path: string, file: File) {
    return binaryRequest<T>("POST", path, file);
  },
  deleteFile(path: string) {
    return binaryRequest("DELETE", path);
  },
};
