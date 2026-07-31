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

export const STAFF_IMAGE_SERVE_PREFIX =
  "/api/staff-images/files/serve/" as const;

@Controller("/staff-images")
export class StaffImageController {
  @Post("/files/:fileName")
  @isAdmin()
  @ResMsg("staff.success.updated")
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
      servePrefix: STAFF_IMAGE_SERVE_PREFIX,
      storageDirectory: "staff-images",
    });
  }

  @Get("/files/serve/:fileName")
  @isOperator()
  @ResMsg("staff.success.retrieved")
  async serve(@Params("fileName") rawFileName: string) {
    return serveManagedImage(
      "staff-images",
      rawFileName,
      "Staff image not found",
    );
  }

  @Delete("/files/:fileName")
  @isAdmin()
  @ResMsg("staff.success.deleted")
  async remove(@Params("fileName") rawFileName: string) {
    return removeManagedImage("staff-images", rawFileName);
  }
}