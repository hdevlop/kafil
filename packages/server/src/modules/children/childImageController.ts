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

import { isChildImageViewer, isOperator, ROLES } from "../../config/authConfig";
import {
  removeManagedImage,
  resolveManagedImageLocation,
  serveManagedImage,
  uploadManagedImage,
} from "../../storage/managedImageController";
import { FamilyRepository } from "../families/familyRepository";
import { ChildRepository } from "./childRepository";

export const CHILD_IMAGE_SERVE_PREFIX =
  "/api/child-images/files/serve/" as const;

@Service()
export class ChildImageAccess {
  constructor(
    private readonly children: ChildRepository,
    private readonly families: FamilyRepository,
  ) {}

  async resolveImage(
    rawFileName: string,
    requester:
      | { role: string; userId: string }
      | null
      | undefined,
  ) {
    const { directory, fileName } = resolveManagedImageLocation(
      "child-images",
      rawFileName,
    );
    const child = await this.children.findByImagePath(
      `${CHILD_IMAGE_SERVE_PREFIX}${fileName}`,
    );
    if (!child) {
      HttpError.notFound("Child image not found");
    }
    if (!requester) {
      HttpError.forbidden("Child image access denied");
    }
    const role = requester.role?.toLowerCase();
    if (role === ROLES.ADMIN || role === ROLES.OPERATOR) {
      return { directory, fileName };
    }
    if (role === ROLES.FAMILY) {
      const family = await this.families.findByUserId(requester.userId);
      if (family && family.id === child!.familyProfileId) {
        return { directory, fileName };
      }
      HttpError.forbidden("Child image access denied");
    }
    HttpError.forbidden("Child image access denied");
  }
}

@Controller("/child-images")
export class ChildImageController {
  constructor(private readonly access: ChildImageAccess) {}

  @Post("/files/:fileName")
  @isOperator()
  @ResMsg("children.success.updated")
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
      servePrefix: CHILD_IMAGE_SERVE_PREFIX,
      storageDirectory: "child-images",
    });
  }

  @Get("/files/serve/:fileName")
  @isChildImageViewer()
  @ResMsg("children.success.retrieved")
  async serve(
    @Params("fileName") rawFileName: string,
    @User("id") userId: string,
    @User("role") role: string,
  ) {
    await this.access.resolveImage(rawFileName, { role, userId });
    return serveManagedImage("child-images", rawFileName, "Child image not found");
  }

  @Delete("/files/:fileName")
  @isOperator()
  @ResMsg("children.success.deleted")
  async remove(@Params("fileName") rawFileName: string) {
    return removeManagedImage("child-images", rawFileName);
  }
}
