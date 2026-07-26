import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import {
  Controller,
  Get,
  HttpError,
  Params,
  ResMsg,
  Service,
  User,
} from "najm-core";

import { isChildImageViewer, ROLES } from "../../config/authConfig";
import { envConfig } from "../../config/envConfig";
import { FamilyRepository } from "../families/familyRepository";
import { ChildRepository } from "./childRepository";

const CHILD_IMAGE_TYPES = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

export const CHILD_IMAGE_SERVE_PREFIX =
  "/api/child-images/files/serve/" as const;

function resolveChildImagePath(rawFileName: string) {
  const fileName = decodeURIComponent(rawFileName);
  if (!/^[0-9a-f-]{36}\.(?:avif|gif|jpg|png|webp)$/i.test(fileName)) {
    HttpError.create(400, "Invalid child image file name");
  }

  return {
    directory: join(
      /* turbopackIgnore: true */ envConfig.storage.basePath,
      "child-images",
    ),
    fileName,
  };
}

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
    const { directory, fileName } = resolveChildImagePath(rawFileName);
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

  @Get("/files/serve/:fileName")
  @isChildImageViewer()
  @ResMsg("children.success.retrieved")
  async serve(
    @Params("fileName") rawFileName: string,
    @User("id") userId: string,
    @User("role") role: string,
  ) {
    const { directory, fileName } = await this.access.resolveImage(
      rawFileName,
      { role, userId },
    );

    try {
      const bytes = await readFile(join(directory, fileName));
      return new Response(new Uint8Array(bytes), {
        headers: {
          "cache-control": "private, max-age=31536000, immutable",
          "content-type": CHILD_IMAGE_TYPES[
            extname(fileName).toLowerCase() as keyof typeof CHILD_IMAGE_TYPES
          ],
        },
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        HttpError.notFound("Child image not found");
      }
      throw error;
    }
  }
}
