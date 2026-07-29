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

import { isAdmin, isOperator } from "../../config/authConfig";
import {
  removeManagedImage,
  serveManagedImage,
  uploadManagedImage,
} from "../../storage/managedImageController";

export const OPERATOR_IMAGE_SERVE_PREFIX =
  "/api/operator-images/files/serve/" as const;

@Controller("/operator-images")
export class OperatorImageController {
  @Post("/files/:fileName")
  @isAdmin()
  @ResMsg("operators.success.updated")
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
      servePrefix: OPERATOR_IMAGE_SERVE_PREFIX,
      storageDirectory: "operator-images",
    });
  }

  @Get("/files/serve/:fileName")
  @isOperator()
  @ResMsg("operators.success.retrieved")
  async serve(@Params("fileName") rawFileName: string) {
    return serveManagedImage("operator-images", rawFileName, "Operator image not found");
  }

  @Delete("/files/:fileName")
  @isAdmin()
  @ResMsg("operators.success.deleted")
  async remove(@Params("fileName") rawFileName: string) {
    return removeManagedImage("operator-images", rawFileName);
  }
}
