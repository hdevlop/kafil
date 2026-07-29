import { decodeManagedImageFileName } from "../../storage/managedImages";
import {
  ArrayBufferBody,
  ContentType,
  Controller,
  Delete,
  Get,
  HttpError,
  Params,
  Post,
  ResMsg,
  Service,
  User,
} from "najm-core";
import { isFamilyImageViewer, isOperator, ROLES } from "../../config/authConfig";
import {
  removeManagedImage,
  serveManagedImage,
  uploadManagedImage,
} from "../../storage/managedImageController";
import { FamilyRepository } from "./familyRepository";

export const FAMILY_IMAGE_SERVE_PREFIX =
  "/api/family-images/files/serve/" as const;

@Service()
export class FamilyImageAccess {
  constructor(private readonly families: FamilyRepository) {}

  async assertCanRead(fileName: string, requester: { role: string; userId: string }) {
    const role = requester.role?.toLowerCase();
    if (role === ROLES.ADMIN || role === ROLES.OPERATOR) return;
    if (role === ROLES.FAMILY) {
      const family = await this.families.findByUserId(requester.userId);
      if (family?.image === `${FAMILY_IMAGE_SERVE_PREFIX}${fileName}`) return;
    }
    HttpError.forbidden("Family image access denied");
  }
}

@Controller("/family-images")
export class FamilyImageController {
  constructor(private readonly access: FamilyImageAccess) {}
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
  @isFamilyImageViewer()
  @ResMsg("families.success.retrieved")
  async serve(
    @Params("fileName") rawFileName: string,
    @User("id") userId: string,
    @User("role") role: string,
  ) {
    const fileName = decodeManagedImageFileName(rawFileName);
    await this.access.assertCanRead(fileName, { role, userId });
    return serveManagedImage("family-images", rawFileName, "Family image not found");
  }

  @Delete("/files/:fileName")
  @isOperator()
  @ResMsg("families.success.deleted")
  async remove(@Params("fileName") rawFileName: string) {
    return removeManagedImage("family-images", rawFileName);
  }
}
