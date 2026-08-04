import { decodeManagedImageFileName } from "../../storage/managedImages";
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
import { isOperator } from "../../config/authConfig";
import {
  removeManagedImage,
  serveManagedImage,
  uploadManagedImage,
} from "../../storage/managedImageController";

export const FAMILY_IMAGE_SERVE_PREFIX =
  "/api/family-images/files/serve/" as const;

@Controller("/family-images")
export class FamilyImageController {
  @Post("/files/:fileName")
  @isOperator()
  @ResMsg("families.success.updated")
  async upload(
    @Params("fileName") rawFileName: string,
    @ArrayBufferBody() body: ArrayBuffer,
    @ContentType() contentType: string | undefined,
  ) {
    return uploadManagedImage({
      body,
      contentType,
      profile: "person",
      rawFileName,
      servePrefix: FAMILY_IMAGE_SERVE_PREFIX,
      storageDirectory: "family-images",
    });
  }

  @Get("/files/serve/:fileName")
  @ResMsg("families.success.retrieved")
  serve(@Params("fileName") rawFileName: string) {
    decodeManagedImageFileName(rawFileName);
    return serveManagedImage("family-images", rawFileName, "Family image not found");
  }

  @Delete("/files/:fileName")
  @isOperator()
  @ResMsg("families.success.deleted")
  async remove(@Params("fileName") rawFileName: string) {
    return removeManagedImage("family-images", rawFileName);
  }
}
