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

import {
  isSponsorImageManager,
  isSponsorImageViewer,
  ROLES,
} from "../../config/authConfig";
import {
  removeManagedImage,
  serveManagedImage,
  uploadManagedImage,
} from "../../storage/managedImageController";
import { decodeManagedImageFileName } from "../../storage/managedImages";
import { SponsorRepository } from "./sponsorRepository";
import { SupportAssignmentRepository } from "../supportAssignments/supportAssignmentRepository";

export const SPONSOR_IMAGE_SERVE_PREFIX =
  "/api/sponsor-images/files/serve/" as const;

@Service()
export class SponsorImageAccess {
  constructor(
    private readonly sponsors: SponsorRepository,
    private readonly assignments: SupportAssignmentRepository,
  ) {}

  async assertCanRead(fileName: string, requester: { role: string; userId: string }) {
    const role = requester.role?.toLowerCase();
    if (role === ROLES.ADMIN || role === ROLES.OPERATOR) return;
    if (role === ROLES.SPONSOR) {
      const sponsor = await this.sponsors.findByUserId(requester.userId);
      if (sponsor?.image === `${SPONSOR_IMAGE_SERVE_PREFIX}${fileName}`) return;
    }
    if (role === ROLES.FAMILY) {
      const canRead = await this.assignments.familyCanReadSponsorImage(
        requester.userId,
        `${SPONSOR_IMAGE_SERVE_PREFIX}${fileName}`,
      );
      if (canRead) return;
    }
    HttpError.forbidden("Sponsor image access denied");
  }

  async assertCanDelete(fileName: string, requester: { role: string }) {
    const role = requester.role?.toLowerCase();
    if (role === ROLES.ADMIN || role === ROLES.OPERATOR) return;
    if (role === ROLES.SPONSOR) {
      const referenced = await this.sponsors.findByImage(
        `${SPONSOR_IMAGE_SERVE_PREFIX}${fileName}`,
      );
      if (!referenced) return;
    }
    HttpError.forbidden("Sponsor image deletion denied");
  }
}

@Controller("/sponsor-images")
export class SponsorImageController {
  constructor(private readonly access: SponsorImageAccess) {}
  @Post("/files/:fileName")
  @isSponsorImageManager()
  @ResMsg("sponsors.success.updated")
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
      servePrefix: SPONSOR_IMAGE_SERVE_PREFIX,
      storageDirectory: "sponsor-images",
    });
  }

  @Get("/files/serve/:fileName")
  @isSponsorImageViewer()
  @ResMsg("sponsors.success.retrieved")
  async serve(
    @Params("fileName") rawFileName: string,
    @User("id") userId: string,
    @User("role") role: string,
  ) {
    const fileName = decodeManagedImageFileName(rawFileName);
    await this.access.assertCanRead(fileName, { role, userId });
    return serveManagedImage("sponsor-images", rawFileName, "Sponsor image not found");
  }

  @Delete("/files/:fileName")
  @isSponsorImageManager()
  @ResMsg("sponsors.success.deleted")
  async remove(
    @Params("fileName") rawFileName: string,
    @User("role") role: string,
  ) {
    const fileName = decodeManagedImageFileName(rawFileName);
    await this.access.assertCanDelete(fileName, { role });
    return removeManagedImage("sponsor-images", rawFileName);
  }
}
