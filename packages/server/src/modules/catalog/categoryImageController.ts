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
import { isCatalogImageViewer, isOperator } from "../../config/authConfig";
import {
  removeManagedImage,
  serveManagedImage,
  uploadManagedImage,
} from "../../storage/managedImageController";

export const CATEGORY_IMAGE_SERVE_PREFIX =
  "/api/category-images/files/serve/" as const;

@Controller("/category-images")
export class CategoryImageController {
  @Post("/files/:fileName")
  @isOperator()
  @ResMsg("catalog.success.updated")
  async upload(
    @Params("fileName") rawFileName: string,
    @ArrayBufferBody() body: ArrayBuffer,
    @ContentType() contentType: string | undefined,
  ) {
    return uploadManagedImage({
      body,
      contentType,
      profile: "catalog",
      rawFileName,
      servePrefix: CATEGORY_IMAGE_SERVE_PREFIX,
      storageDirectory: "category-images",
    });
  }

  @Get("/files/serve/:fileName")
  @isCatalogImageViewer()
  @ResMsg("catalog.success.retrieved")
  async serve(@Params("fileName") rawFileName: string) {
    return serveManagedImage("category-images", rawFileName, "Category image not found");
  }

  @Delete("/files/:fileName")
  @isOperator()
  @ResMsg("catalog.success.deleted")
  async remove(@Params("fileName") rawFileName: string) {
    return removeManagedImage("category-images", rawFileName);
  }
}
