import {
  ArrayBufferBody,
  ContentType,
  Controller,
  Delete,
  Get,
  Params,
  Post,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";

import { isDeliveryStaff, isOperator } from "../../config/authConfig";
import {
  OrderEvidenceService,
  type OrderEvidenceKind,
} from "./orderEvidenceService";

@ToolGroup("order-evidence")
@Controller("/order-evidence")
export class OrderEvidenceController {
  constructor(private readonly evidence: OrderEvidenceService) {}

  @Post("/:kind/:fileName")
  @isOperator()
  @ResMsg("orders.success.evidenceUploaded")
  upload(
    @Params("kind") kind: OrderEvidenceKind,
    @Params("fileName") fileName: string,
    @ArrayBufferBody() body: ArrayBuffer,
    @ContentType() contentType: string | undefined,
  ) {
    return this.evidence.upload(kind, fileName, body, contentType);
  }

  /**
   * The assigned Delivery worker may stage and discard its own receipt
   * candidate, and nothing else. Serving, delivery proofs, arbitrary `kind`
   * selection, and the maintenance routes stay operator-only.
   */
  @Post("/me/receipts/:fileName")
  @isDeliveryStaff()
  @ResMsg("orders.success.evidenceUploaded")
  uploadOwnReceipt(
    @Params("fileName") fileName: string,
    @ArrayBufferBody() body: ArrayBuffer,
    @ContentType() contentType: string | undefined,
  ) {
    return this.evidence.upload("receipts", fileName, body, contentType);
  }

  @Delete("/me/receipts/:fileName")
  @isDeliveryStaff()
  @ResMsg("orders.success.evidenceDeleted")
  removeOwnReceiptCandidate(@Params("fileName") fileName: string) {
    return this.evidence.removeCandidate("receipts", fileName);
  }

  @Get("/:kind/serve/:fileName")
  @isOperator()
  @ResMsg("orders.success.evidenceRetrieved")
  async serve(
    @Params("kind") kind: OrderEvidenceKind,
    @Params("fileName") fileName: string,
  ) {
    const evidence = await this.evidence.read(kind, fileName);
    return new Response(new Uint8Array(evidence.bytes), {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="${evidence.fileName}"`,
        "content-type": evidence.mediaType,
        "x-content-type-options": "nosniff",
      },
    });
  }

  @Delete("/:kind/:fileName")
  @isOperator()
  @ResMsg("orders.success.evidenceDeleted")
  removeCandidate(
    @Params("kind") kind: OrderEvidenceKind,
    @Params("fileName") fileName: string,
  ) {
    return this.evidence.removeCandidate(kind, fileName);
  }

  @Get("/maintenance/orphans")
  @isOperator()
  @McpTool({
    description: "List unreferenced protected order evidence candidates",
    readOnly: true,
  })
  @ResMsg("orders.success.evidenceRetrieved")
  listOrphans() {
    return this.evidence.listOrphans();
  }

  @Post("/maintenance/orphans/cleanup")
  @isOperator()
  @McpTool({
    description: "Delete unreferenced order evidence older than 24 hours",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Delete old unreferenced order evidence candidates?",
    },
  })
  @ResMsg("orders.success.evidenceDeleted")
  cleanupOrphans() {
    return this.evidence.cleanupOrphans();
  }
}
