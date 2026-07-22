import { Service } from "najm-core";

import { AuditRepository } from "./auditRepository";

const SENSITIVE_METADATA_KEYS = new Set([
  "authorization",
  "password",
  "token",
  "refreshToken",
  "accessToken",
  "cin",
  "guardianCin",
  "exactAddress",
  "document",
  "documentId",
]);

export interface RecordAuditEventInput {
  action: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
  resource: string;
  resourceId: string;
}

@Service()
export class AuditService {
  constructor(private readonly events: AuditRepository) {}

  record(input: RecordAuditEventInput) {
    return this.events.create({
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      metadata: sanitizeMetadata(input.metadata ?? {}),
      requestId: input.requestId ?? null,
      resource: input.resource,
      resourceId: input.resourceId,
    });
  }
}

function sanitizeMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([key, value]) =>
        !SENSITIVE_METADATA_KEYS.has(key) &&
        (value === null ||
          typeof value === "boolean" ||
          typeof value === "number" ||
          typeof value === "string"),
    ),
  );
}
