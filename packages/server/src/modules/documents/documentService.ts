import { Service } from "najm-core";

import {
  type CreateDocumentDto,
  createDocumentDto,
  type DocumentListQuery,
  documentListQuery,
  type UpdateDocumentDto,
  updateDocumentDto,
} from "./documentDto";
import { DocumentRepository } from "./documentRepository";
import { DocumentValidator } from "./documentValidator";

@Service()
export class DocumentService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly validator: DocumentValidator,
  ) {}

  async list(query: DocumentListQuery) {
    const { limit, offset, familyProfileId } = documentListQuery.parse(
      query ?? {},
    );
    return this.documents.list(limit, offset, familyProfileId);
  }

  async get(id: string) {
    return this.validator.ensureExists(id);
  }

  async create(data: CreateDocumentDto, createdByUserId: string) {
    const input = createDocumentDto.parse(data);
    await this.validator.ensureFamilyExists(input.familyProfileId);
    await this.validator.ensureStoragePathUnique(input.storagePath);
    return this.documents.create({
      ...input,
      createdByUserId,
    });
  }

  async update(id: string, data: UpdateDocumentDto) {
    await this.validator.ensureExists(id);
    return this.documents.update(
      id,
      updateDocumentDto.parse(data),
    );
  }

  async delete(id: string) {
    await this.validator.ensureExists(id);
    return this.documents.delete(id);
  }
}
