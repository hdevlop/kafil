"use client";

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

async function ensureAccessToken(path: string) {
  const isPublicAccessPath = [
    "/access/login",
    "/access/register/sponsor",
    "/access/email-verification/request",
    "/access/email-verification/confirm",
  ].includes(path);
  if (path.startsWith("/auth/") || isPublicAccessPath) return;

  const state = auth.client.getState();
  if (!state.isAuthenticated || state.accessToken) return;

  pendingAccessTokenRefresh ??= auth.client.refresh().finally(() => {
    pendingAccessTokenRefresh = null;
  });

  await pendingAccessTokenRefresh;
}

async function binaryRequest(
  method: "DELETE" | "POST",
  path: string,
  body?: Blob,
  retried = false,
) {
  await ensureAccessToken(path);

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
    return binaryRequest(method, path, body, true);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message ?? `File request failed (${response.status})`);
  }
}

async function request<T>(
  method: "delete" | "get" | "patch" | "post" | "put",
  path: string,
  body?: unknown,
) {
  await ensureAccessToken(path);

  if (method === "get") {
    return unwrapApiResponse(await auth.api.get<T | ApiResponseEnvelope<T>>(path));
  }

  const options = body === undefined ? undefined : { body };
  return unwrapApiResponse(
    await auth.api[method]<T | ApiResponseEnvelope<T>>(path, options),
  );
}

export const api = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>("get", buildApiPath(path, options?.query));
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
  upload(path: string, file: File) {
    return binaryRequest("POST", path, file);
  },
  deleteFile(path: string) {
    return binaryRequest("DELETE", path);
  },
};
