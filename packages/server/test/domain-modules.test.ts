import { describe, expect, it } from "bun:test";
import {
  getMcpAnnotations,
  getMcpConfirmation,
  getMcpToolGroup,
  getMcpTools,
} from "najm-mcp";
import { getValidationConfig } from "najm-validation";

import {
  createDocumentDto,
  documentIdParams,
  documentListQuery,
  DocumentController,
  DocumentRepository,
  DocumentService,
  DocumentValidator,
  updateDocumentDto,
} from "../src/modules/documents";

const familyId = "00000000-0000-4000-8000-000000000010";
const documentId = "00000000-0000-4000-8000-000000000020";

describe("document module", () => {
  it("exposes document operations as guarded MCP tools", () => {
    expect(getMcpToolGroup(DocumentController)).toBe("documents");
    expect(getMcpTools(DocumentController).map((tool) => tool.methodKey)).toEqual([
      "list",
      "get",
      "create",
      "update",
      "delete",
    ]);
    expect(
      getMcpAnnotations(DocumentController.prototype.list)?.readOnlyHint,
    ).toBe(true);
    expect(
      getMcpConfirmation(DocumentController.prototype.delete),
    ).toMatchObject({ level: "danger" });
  });

  it("validates every route boundary", () => {
    expect(
      getValidationConfig(DocumentController.prototype, "list")?.query,
    ).toBe(documentListQuery);
    expect(
      getValidationConfig(DocumentController.prototype, "get")?.params,
    ).toBe(documentIdParams);
    expect(
      getValidationConfig(DocumentController.prototype, "create")?.body,
    ).toBe(createDocumentDto);
    expect(
      getValidationConfig(DocumentController.prototype, "update"),
    ).toMatchObject({
      body: updateDocumentDto,
      params: documentIdParams,
    });
    expect(
      getValidationConfig(DocumentController.prototype, "delete")?.params,
    ).toBe(documentIdParams);
  });

  it("keeps storage identity immutable on update", () => {
    expect(
      updateDocumentDto.parse({
        classification: "verification",
        familyProfileId: "00000000-0000-4000-8000-000000000099",
        storagePath: "changed/path",
      }),
    ).toEqual({ classification: "verification" });
  });

  it("sets the authenticated creator on document metadata", async () => {
    const creates: Record<string, unknown>[] = [];
    const validatorCalls: string[] = [];
    const service = new DocumentService(
      {
        create: async (input: Record<string, unknown>) => {
          creates.push(input);
          return { id: documentId, ...input };
        },
      } as unknown as DocumentRepository,
      {
        ensureFamilyExists: async () => {
          validatorCalls.push("family");
        },
        ensureStoragePathUnique: async () => {
          validatorCalls.push("storagePath");
        },
      } as unknown as DocumentValidator,
    );

    await service.create(
      {
        familyProfileId: familyId,
        classification: "identity",
        storagePath: "protected/identity.pdf",
        mediaType: "application/pdf",
        byteSize: 1024,
      },
      "operator-user",
    );

    expect(creates).toEqual([
      expect.objectContaining({ createdByUserId: "operator-user" }),
    ]);
    expect(validatorCalls).toEqual(["family", "storagePath"]);
  });
});
