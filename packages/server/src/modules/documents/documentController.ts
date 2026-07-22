import {
  Body,
  Controller,
  Delete,
  Get,
  Params,
  Post,
  Put,
  Query,
  User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isOperator } from "../../config/authConfig";
import {
  type CreateDocumentDto,
  createDocumentDto,
  documentIdParams,
  type DocumentListQuery,
  documentListQuery,
  type UpdateDocumentDto,
  updateDocumentDto,
} from "./documentDto";
import {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  Document,
  Policy,
} from "./documentGuards";
import { DocumentService } from "./documentService";

@ToolGroup("documents")
@Policy(Document)
@Controller("/documents")
@isOperator()
export class DocumentController {
  constructor(private readonly documents: DocumentService) {}

  @Get()
  @CanList()
  @Validate({ query: documentListQuery })
  @McpTool({
    description: "List protected document metadata available to the authenticated user",
    readOnly: true,
  })
  @ResMsg("documents.success.retrieved")
  list(@Query() query: DocumentListQuery) {
    return this.documents.list(query);
  }

  @Get("/:id")
  @CanRead()
  @Validate({ params: documentIdParams })
  @McpTool({
    description: "Get protected document metadata by ID",
    readOnly: true,
  })
  @ResMsg("documents.success.retrieved")
  get(@Params("id") id: string) {
    return this.documents.get(id);
  }

  @Post()
  @CanCreate()
  @Validate({ body: createDocumentDto })
  @McpTool({
    description: "Create protected document metadata",
    idempotent: false,
    confirm: {
      level: "warning",
      message: "Create this protected document record?",
    },
  })
  @ResMsg("documents.success.created")
  create(
    @Body() body: CreateDocumentDto,
    @User("id") createdByUserId: string,
  ) {
    return this.documents.create(body, createdByUserId);
  }

  @Put("/:id")
  @CanUpdate()
  @Validate({ params: documentIdParams, body: updateDocumentDto })
  @McpTool({
    description: "Update protected document metadata by ID",
    confirm: {
      level: "warning",
      message: "Update this protected document record?",
    },
  })
  @ResMsg("documents.success.updated")
  update(@Params("id") id: string, @Body() body: UpdateDocumentDto) {
    return this.documents.update(id, body);
  }

  @Delete("/:id")
  @CanDelete()
  @Validate({ params: documentIdParams })
  @McpTool({
    description: "Delete protected document metadata by ID",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Permanently delete this protected document record?",
    },
  })
  @ResMsg("documents.success.deleted")
  delete(@Params("id") id: string) {
    return this.documents.delete(id);
  }
}
