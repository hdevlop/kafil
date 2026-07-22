import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

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
} from "najm-core";
import { envConfig } from "../../config/envConfig";
import { isOperator } from "../../config/authConfig";

const MAX_FAMILY_IMAGE_SIZE = 5_000_000;
const FAMILY_IMAGE_TYPES = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

export const FAMILY_IMAGE_SERVE_PREFIX =
  "/api/family-images/files/serve/" as const;

function resolveFamilyImagePath(rawFileName: string) {
  const fileName = decodeURIComponent(rawFileName);
  if (!/^[0-9a-f-]{36}\.(?:avif|gif|jpg|png|webp)$/i.test(fileName)) {
    HttpError.create(400, "Invalid family image file name");
  }

  return {
    directory: join(
      /* turbopackIgnore: true */ envConfig.storage.basePath,
      "family-images",
    ),
    fileName,
  };
}

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
    const { directory, fileName } = resolveFamilyImagePath(rawFileName);
    const expectedType = FAMILY_IMAGE_TYPES[
      extname(fileName).toLowerCase() as keyof typeof FAMILY_IMAGE_TYPES
    ];
    if (!contentType || contentType.toLowerCase() !== expectedType) {
      HttpError.create(415, "Unsupported family image type");
    }
    if (body.byteLength === 0 || body.byteLength > MAX_FAMILY_IMAGE_SIZE) {
      HttpError.create(413, "Family image must be between 1 byte and 5 MB");
    }

    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, fileName), new Uint8Array(body), {
      flag: "wx",
    });

    return {
      path: `${FAMILY_IMAGE_SERVE_PREFIX}${encodeURIComponent(fileName)}`,
    };
  }

  @Get("/files/serve/:fileName")
  @isOperator()
  @ResMsg("families.success.retrieved")
  async serve(@Params("fileName") rawFileName: string) {
    const { directory, fileName } = resolveFamilyImagePath(rawFileName);

    try {
      const bytes = await readFile(join(directory, fileName));
      return new Response(new Uint8Array(bytes), {
        headers: {
          "cache-control": "private, max-age=31536000, immutable",
          "content-type": FAMILY_IMAGE_TYPES[
            extname(fileName).toLowerCase() as keyof typeof FAMILY_IMAGE_TYPES
          ],
        },
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        HttpError.notFound("Family image not found");
      }
      throw error;
    }
  }

  @Delete("/files/:fileName")
  @isOperator()
  @ResMsg("families.success.deleted")
  async remove(@Params("fileName") rawFileName: string) {
    const { directory, fileName } = resolveFamilyImagePath(rawFileName);

    try {
      await unlink(join(directory, fileName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    return { deleted: true };
  }
}
