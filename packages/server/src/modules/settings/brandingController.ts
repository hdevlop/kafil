import {
  ArrayBufferBody,
  Body,
  ContentType,
  Controller,
  Delete,
  Get,
  HttpError,
  Params,
  Post,
  Put,
  ResMsg,
  User,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isAdmin } from "../../config/authConfig";
import {
  type ResetBrandingDto,
  resetBrandingDto,
  type UpdateBrandingDto,
  updateBrandingDto,
} from "./brandingDto";
import { BrandingService } from "./brandingService";
import { BRANDING_SLOTS, type BrandingSlot } from "./brandingTypes";

@ToolGroup("branding")
@Controller("/branding")
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Get("/")
  @McpTool({
    description: "Read the active public platform branding assets",
    readOnly: true,
  })
  @ResMsg("branding.success.retrieved")
  getBranding() {
    return this.branding.get();
  }

  @Get("/config")
  @isAdmin()
  @McpTool({
    description:
      "Read the platform branding configuration with both customPath and resolvedPath per slot",
    readOnly: true,
  })
  @ResMsg("branding.success.retrieved")
  getBrandingConfig() {
    return this.branding.getAdminConfig();
  }

  @Put("/")
  @isAdmin()
  @Validate({ body: updateBrandingDto })
  @McpTool({
    description: "Commit selected platform branding asset paths",
    confirm: {
      level: "warning",
      message: "Save these platform branding assets?",
    },
  })
  @ResMsg("branding.success.updated")
  updateBranding(
    @Body() body: UpdateBrandingDto,
    @User("id") actorUserId: string,
  ) {
    return this.branding.save(body, actorUserId);
  }

  @Post("/reset")
  @isAdmin()
  @Validate({ body: resetBrandingDto })
  @McpTool({
    description: "Reset all platform branding assets to the factory fallbacks",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Reset all platform branding assets to factory fallbacks?",
    },
  })
  @ResMsg("branding.success.reset")
  resetBranding(
    @Body() body: ResetBrandingDto,
    @User("id") actorUserId: string,
  ) {
    return this.branding.reset(body, actorUserId);
  }

  @Post("/assets/:slot/:fileName")
  @isAdmin()
  @ResMsg("branding.success.uploaded")
  async uploadAsset(
    @Params("slot") rawSlot: string,
    @Params("fileName") rawFileName: string,
    @ArrayBufferBody() body: ArrayBuffer,
    @ContentType() contentType: string | undefined,
  ) {
    if (!contentType) {
      HttpError.create(415, "Branding asset must declare a content type");
    }
    const slot = this.assertSlot(rawSlot);
    const fileName = decodeURIComponent(rawFileName);
    const bytes = new Uint8Array(body);
    return this.branding.uploadAsset({
      slot,
      fileName,
      declaredMime: contentType,
      bytes,
    });
  }

  @Get("/assets/serve/:fileName")
  @ResMsg("branding.success.retrieved")
  async serveAsset(@Params("fileName") rawFileName: string) {
    const fileName = decodeURIComponent(rawFileName);
    const asset = await this.branding.readPublicAsset(fileName);
    if (!asset) HttpError.notFound("Branding asset not found");
    const body = new Uint8Array(asset.bytes);
    return new Response(
      body.buffer.slice(
        body.byteOffset,
        body.byteOffset + body.byteLength,
      ) as ArrayBuffer,
      {
        headers: {
          "content-type": asset.mime,
          "cache-control": "public, max-age=31536000, immutable",
        },
      },
    );
  }

  @Delete("/assets/:fileName")
  @isAdmin()
  @McpTool({
    description: "Delete an unreferenced branding asset candidate",
    destructive: true,
    confirm: {
      level: "warning",
      message: "Delete this branding asset candidate?",
    },
  })
  @ResMsg("branding.success.deleted")
  async deleteAsset(@Params("fileName") rawFileName: string) {
    const fileName = decodeURIComponent(rawFileName);
    return this.branding.deleteCandidateByFileName(fileName);
  }

  @Delete("/assets")
  @isAdmin()
  @ResMsg("branding.success.deleted")
  async deleteAssets(
    @Body() body: { paths?: string[]; candidates?: string[] } = {},
  ) {
    const paths = Array.isArray(body.paths)
      ? body.paths
      : Array.isArray(body.candidates)
        ? body.candidates
        : [];
    return this.branding.deleteCandidatesByPath(paths);
  }

  private assertSlot(raw: string): BrandingSlot {
    if (!BRANDING_SLOTS.includes(raw as BrandingSlot)) {
      HttpError.create(400, "Unknown branding slot");
    }
    return raw as BrandingSlot;
  }
}
