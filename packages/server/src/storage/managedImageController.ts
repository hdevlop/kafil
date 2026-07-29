import { unlink } from "node:fs/promises";
import { join } from "node:path";

import { HttpError } from "najm-core";

import { envConfig } from "../config/envConfig";
import {
  decodeManagedImageFileName,
  readManagedImage,
  type ManagedImageProfileName,
  writeManagedImage,
} from "./managedImages";

export function managedImageDirectory(storageDirectory: string) {
  return join(
    /* turbopackIgnore: true */ envConfig.storage.basePath,
    storageDirectory,
  );
}

export function resolveManagedImageLocation(
  storageDirectory: string,
  rawFileName: string,
) {
  return {
    directory: managedImageDirectory(storageDirectory),
    fileName: decodeManagedImageFileName(rawFileName),
  };
}

export async function uploadManagedImage(input: {
  body: ArrayBuffer;
  contentType?: string;
  profile: ManagedImageProfileName;
  rawFileName: string;
  servePrefix: string;
  storageDirectory: string;
}) {
  const result = await writeManagedImage({
    bytes: new Uint8Array(input.body),
    declaredMime: input.contentType,
    directory: managedImageDirectory(input.storageDirectory),
    profile: input.profile,
    requestedFileName: input.rawFileName,
    servePrefix: input.servePrefix,
  });
  return { path: result.path };
}

export async function serveManagedImage(
  storageDirectory: string,
  rawFileName: string,
  notFoundMessage: string,
) {
  const directory = managedImageDirectory(storageDirectory);
  try {
    const image = await readManagedImage(directory, rawFileName);
    return new Response(image.bytes, {
      headers: {
        "cache-control": "private, max-age=31536000, immutable",
        "content-type": image.mime,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      HttpError.notFound(notFoundMessage);
    }
    throw error;
  }
}

export async function removeManagedImage(
  storageDirectory: string,
  rawFileName: string,
) {
  const { directory, fileName } = resolveManagedImageLocation(
    storageDirectory,
    rawFileName,
  );
  try {
    await unlink(join(directory, fileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return { deleted: true };
}
