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

import { isOperator, isSponsorImageViewer } from "../../config/authConfig";
import { envConfig } from "../../config/envConfig";

const MAX_SPONSOR_IMAGE_SIZE = 5_000_000;
const SPONSOR_IMAGE_TYPES = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

export const SPONSOR_IMAGE_SERVE_PREFIX =
  "/api/sponsor-images/files/serve/" as const;

function resolveSponsorImagePath(rawFileName: string) {
  const fileName = decodeURIComponent(rawFileName);
  if (!/^[0-9a-f-]{36}\.(?:avif|gif|jpg|png|webp)$/i.test(fileName)) {
    HttpError.create(400, "Invalid sponsor image file name");
  }

  return {
    directory: join(
      /* turbopackIgnore: true */ envConfig.storage.basePath,
      "sponsor-images",
    ),
    fileName,
  };
}

@Controller("/sponsor-images")
export class SponsorImageController {
  @Post("/files/:fileName")
  @isOperator()
  @ResMsg("sponsors.success.updated")
  async upload(
    @Params("fileName") rawFileName: string,
    @ArrayBufferBody() body: ArrayBuffer,
    @ContentType() contentType: string | undefined,
  ) {
    const { directory, fileName } = resolveSponsorImagePath(rawFileName);
    const expectedType = SPONSOR_IMAGE_TYPES[
      extname(fileName).toLowerCase() as keyof typeof SPONSOR_IMAGE_TYPES
    ];
    if (!contentType || contentType.toLowerCase() !== expectedType) {
      HttpError.create(415, "Unsupported sponsor image type");
    }
    if (body.byteLength === 0 || body.byteLength > MAX_SPONSOR_IMAGE_SIZE) {
      HttpError.create(413, "Sponsor image must be between 1 byte and 5 MB");
    }

    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, fileName), new Uint8Array(body), {
      flag: "wx",
    });

    return {
      path: `${SPONSOR_IMAGE_SERVE_PREFIX}${encodeURIComponent(fileName)}`,
    };
  }

  @Get("/files/serve/:fileName")
  @isSponsorImageViewer()
  @ResMsg("sponsors.success.retrieved")
  async serve(@Params("fileName") rawFileName: string) {
    const { directory, fileName } = resolveSponsorImagePath(rawFileName);

    try {
      const bytes = await readFile(join(directory, fileName));
      return new Response(new Uint8Array(bytes), {
        headers: {
          "cache-control": "private, max-age=31536000, immutable",
          "content-type": SPONSOR_IMAGE_TYPES[
            extname(fileName).toLowerCase() as keyof typeof SPONSOR_IMAGE_TYPES
          ],
        },
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        HttpError.notFound("Sponsor image not found");
      }
      throw error;
    }
  }

  @Delete("/files/:fileName")
  @isOperator()
  @ResMsg("sponsors.success.deleted")
  async remove(@Params("fileName") rawFileName: string) {
    const { directory, fileName } = resolveSponsorImagePath(rawFileName);

    try {
      await unlink(join(directory, fileName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    return { deleted: true };
  }
}
