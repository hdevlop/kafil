import { HttpError, Service } from "najm-core";

import { FamilyValidator } from "../families/familyValidator";
import { DocumentRepository } from "./documentRepository";

@Service()
export class DocumentValidator {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly families: FamilyValidator,
  ) {}

  async ensureExists(id: string) {
    const document = await this.documents.findById(id);
    if (!document) {
      HttpError.notFound("Document not found");
    }
    return document;
  }

  async ensureFamilyExists(familyProfileId: string) {
    return this.families.ensureExists(familyProfileId);
  }

  async ensureStoragePathUnique(storagePath: string, excludeId?: string) {
    const existing = await this.documents.findByStoragePath(storagePath);
    if (existing && existing.id !== excludeId) {
      HttpError.conflict("Document storage path already exists");
    }
  }
}
