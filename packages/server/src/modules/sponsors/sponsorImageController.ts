import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import {
  Controller,
  Get,
  HttpError,
  Params,
  ResMsg,
} from "najm-core";

import { isSponsorImageViewer } from "../../config/authConfig";
import { envConfig } from "../../config/envConfig";

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
}
