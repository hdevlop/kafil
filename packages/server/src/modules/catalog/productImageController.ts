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

export const PRODUCT_IMAGE_SERVE_PREFIX =
  "/api/product-images/files/serve/" as const;

@Controller("/product-images")
export class ProductImageController {
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
      servePrefix: PRODUCT_IMAGE_SERVE_PREFIX,
      storageDirectory: "product-images",
    });
  }

  @Get("/files/serve/:fileName")
  @ResMsg("catalog.success.retrieved")
  async serve(@Params("fileName") rawFileName: string) {
    return serveManagedImage("product-images", rawFileName, "Product image not found");
  }

  @Delete("/files/:fileName")
  @isOperator()
  @ResMsg("catalog.success.deleted")
  async remove(@Params("fileName") rawFileName: string) {
    return removeManagedImage("product-images", rawFileName);
  }
}
