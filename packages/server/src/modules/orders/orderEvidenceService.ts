import {
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { extname, join } from "node:path";

import { HttpError, Service } from "najm-core";

import { envConfig } from "../../config/envConfig";
import { OrderPurchaseRepository } from "./orderRepository";

export type OrderEvidenceKind = "deliveries" | "receipts";

const MAX_EVIDENCE_SIZE = 10_000_000;
const EVIDENCE_TYPES = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

@Service()
export class OrderEvidenceService {
  constructor(private readonly purchases: OrderPurchaseRepository) {}

  async upload(
    kind: OrderEvidenceKind,
    rawFileName: string,
    body: ArrayBuffer,
    contentType: string | undefined,
  ) {
    const target = resolveEvidenceTarget(kind, rawFileName);
    const expectedType =
      EVIDENCE_TYPES[
        extname(target.fileName).toLowerCase() as keyof typeof EVIDENCE_TYPES
      ];
    if (!contentType || contentType.toLowerCase() !== expectedType) {
      HttpError.create(415, "Evidence file type does not match its extension");
    }
    if (body.byteLength === 0 || body.byteLength > MAX_EVIDENCE_SIZE) {
      HttpError.create(413, "Evidence must be between 1 byte and 10 MB");
    }
    const bytes = new Uint8Array(body);
    if (!matchesSignature(bytes, expectedType)) {
      HttpError.create(415, "Evidence file signature is invalid");
    }

    await mkdir(target.directory, { recursive: true });
    await writeFile(join(target.directory, target.fileName), bytes, {
      flag: "wx",
    });

    return {
      path: evidenceReference(kind, target.fileName),
      mediaType: expectedType,
      byteSize: body.byteLength,
    };
  }

  async read(kind: OrderEvidenceKind, rawFileName: string) {
    const target = resolveEvidenceTarget(kind, rawFileName);
    try {
      return {
        bytes: await readFile(join(target.directory, target.fileName)),
        fileName: target.fileName,
        mediaType:
          EVIDENCE_TYPES[
            extname(target.fileName).toLowerCase() as keyof typeof EVIDENCE_TYPES
          ],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        HttpError.notFound("Order evidence not found");
      }
      throw error;
    }
  }

  async removeCandidate(kind: OrderEvidenceKind, rawFileName: string) {
    const target = resolveEvidenceTarget(kind, rawFileName);
    const reference = evidenceReference(kind, target.fileName);
    const referenced =
      kind === "receipts"
        ? await this.purchases.isReceiptReferenced(reference)
        : await this.purchases.isDeliveryProofReferenced(reference);
    if (referenced) {
      HttpError.conflict("Confirmed order evidence cannot be deleted");
    }

    try {
      await unlink(join(target.directory, target.fileName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return { deleted: true };
  }

  async listOrphans() {
    const referenced = new Set(
      await this.purchases.listReferencedEvidencePaths(),
    );
    const candidates = await Promise.all(
      (["receipts", "deliveries"] as const).map(async (kind) => {
        const directory = evidenceDirectory(kind);
        const entries = await readdir(directory, {
          withFileTypes: true,
        }).catch((error: NodeJS.ErrnoException) => {
          if (error.code === "ENOENT") return [];
          throw error;
        });
        return Promise.all(
          entries
            .filter((entry) => entry.isFile())
            .map(async (entry) => {
              const file = await stat(join(directory, entry.name));
              const path = evidenceReference(kind, entry.name);
              return {
                kind,
                path,
                byteSize: file.size,
                createdAt: file.birthtime.toISOString(),
                modifiedAt: file.mtime.toISOString(),
                referenced: referenced.has(path),
              };
            }),
        );
      }),
    );
    return candidates.flat().filter((candidate) => !candidate.referenced);
  }

  async cleanupOrphans(olderThanHours = 24) {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1_000;
    const orphans = await this.listOrphans();
    const eligible = orphans.filter(
      (orphan) => new Date(orphan.modifiedAt).getTime() < cutoff,
    );
    for (const orphan of eligible) {
      const fileName = orphan.path.slice(orphan.path.lastIndexOf("/") + 1);
      await this.removeCandidate(orphan.kind, fileName);
    }
    return {
      deleted: eligible.length,
      retained: orphans.length - eligible.length,
    };
  }

  async ensureManagedReference(
    kind: OrderEvidenceKind,
    reference: string,
    mediaType: string,
    byteSize: number,
  ) {
    const prefix = `/api/order-evidence/${kind}/serve/`;
    if (!reference.startsWith(prefix)) {
      HttpError.create(400, "Evidence path is not managed by Kafil");
    }
    const fileName = reference.slice(prefix.length);
    const evidence = await this.read(kind, fileName);
    if (
      evidence.mediaType !== mediaType ||
      evidence.bytes.byteLength !== byteSize
    ) {
      HttpError.conflict("Evidence metadata no longer matches the stored file");
    }
  }
}

export function evidenceReference(
  kind: OrderEvidenceKind,
  fileName: string,
) {
  return `/api/order-evidence/${kind}/serve/${encodeURIComponent(fileName)}`;
}

function evidenceDirectory(kind: OrderEvidenceKind) {
  return join(
    /* turbopackIgnore: true */ envConfig.storage.basePath,
    "order-evidence",
    kind,
  );
}

function resolveEvidenceTarget(
  kind: OrderEvidenceKind,
  rawFileName: string,
) {
  const fileName = decodeURIComponent(rawFileName);
  if (
    !/^[0-9a-f-]{36}\.(?:pdf|jpg|jpeg|png|webp)$/i.test(fileName) ||
    !["deliveries", "receipts"].includes(kind)
  ) {
    HttpError.create(400, "Invalid order evidence file name");
  }
  return { directory: evidenceDirectory(kind), fileName };
}

function matchesSignature(bytes: Uint8Array, mediaType: string) {
  if (mediaType === "application/pdf") {
    return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  }
  if (mediaType === "image/jpeg") {
    return startsWith(bytes, [0xff, 0xd8, 0xff]);
  }
  if (mediaType === "image/png") {
    return startsWith(bytes, [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  }
  if (mediaType === "image/webp") {
    return (
      startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}
