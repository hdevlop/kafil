import { z } from "zod";

const documentFields = z.object({
  familyProfileId: z.string().uuid(),
  classification: z.enum(["identity", "verification"]),
  storagePath: z.string().trim().min(1).max(1_000),
  mediaType: z.string().trim().min(3).max(160),
  byteSize: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});

export const createDocumentDto = documentFields;
export const updateDocumentDto = documentFields
  .omit({ familyProfileId: true, storagePath: true })
  .partial();
export const documentIdParams = z.object({
  id: z.string().uuid(),
});
export const documentListQuery = z.object({
  familyProfileId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateDocumentDto = z.input<typeof createDocumentDto>;
export type UpdateDocumentDto = z.input<typeof updateDocumentDto>;
export type DocumentListQuery = z.input<typeof documentListQuery>;
