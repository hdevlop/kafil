export interface ApiErrorBody {
  code?: string;
  error?: string;
  message?: string;
  issues?: unknown;
}

export class KafilApiError extends Error {
  readonly status?: number;
  readonly body?: unknown;
  readonly code?: string;

  constructor(
    message: string,
    options: { status?: number; body?: unknown; code?: string } = {},
  ) {
    super(message);
    this.name = "KafilApiError";
    this.status = options.status;
    this.body = options.body;
    this.code = options.code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readMessage(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (!isRecord(value)) return undefined;

  if (typeof value.message === "string" && value.message.trim()) {
    return value.message;
  }

  if (typeof value.error === "string" && value.error.trim()) {
    return value.error;
  }

  return undefined;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  if (typeof error.status === "number") return error.status;

  const response = error.response;
  if (isRecord(response) && typeof response.status === "number") {
    return response.status;
  }

  return undefined;
}

export function getApiErrorBody(error: unknown): unknown {
  if (!isRecord(error)) return undefined;
  if ("body" in error) return error.body;

  const response = error.response;
  if (isRecord(response) && "data" in response) {
    return response.data;
  }

  return undefined;
}

export function toApiError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (error instanceof KafilApiError) return error;

  const body = getApiErrorBody(error);
  const status = getApiErrorStatus(error);
  const message =
    readMessage(body) ||
    (error instanceof Error ? error.message : undefined) ||
    fallback;
  const code =
    isRecord(body) && typeof body.code === "string" ? body.code : undefined;

  return new KafilApiError(message, { status, body, code });
}

export function getApiErrorMessage(error: unknown, fallback?: string) {
  return toApiError(error, fallback).message;
}
