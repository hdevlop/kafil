import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { envConfig } from "@kafil/server/config";
import { pool } from "@kafil/server/database";
import {
  assertManagedImageCompliant,
  normalizeManagedImage,
  writeManagedImage,
  type ManagedImageProfileName,
} from "@kafil/server/managed-images";

/**
 * Branding is deliberately absent from this job.
 *
 * `najm-theme` owns branding assets after the Move 8 adoption: it probes,
 * normalizes, names, and sweeps them, and its `slot_config` records the MIME
 * type and byte count of the bytes it actually wrote. Re-encoding those files
 * behind its back would leave every slot record describing a file that no
 * longer matches it. `POST /api/branding/assets/reconcile` is the branding
 * equivalent of this command.
 */
type ImageKind =
  | "family"
  | "sponsor"
  | "operator"
  | "child"
  | "category"
  | "product";

interface ImageReference {
  kind: ImageKind;
  ownerId: string;
  path: string;
}

export interface ImageBackfillManifestEntry {
  kind: ImageKind;
  ownerId: string;
  oldPath: string;
  newPath: string;
  oldChecksum: string;
  newChecksum: string;
  oldBytes: number;
  newBytes: number;
}

export interface ImageBackfillManifest {
  version: 1;
  createdAt: string;
  storageBasePath: string;
  entries: ImageBackfillManifestEntry[];
}

export interface ImageBackfillSummary {
  referenced: number;
  compliant: number;
  converted: number;
  exempt: number;
  missing: number;
  oldBytes: number;
  projectedBytes: number;
  savingsBytes: number;
  manifestPath?: string;
}

const PROFILE_BY_KIND: Record<ImageKind, ManagedImageProfileName> = {
  family: "person",
  sponsor: "person",
  operator: "person",
  child: "person",
  category: "catalog",
  product: "catalog",
};

const STORAGE_BY_KIND: Record<ImageKind, string> = {
  family: "family-images",
  sponsor: "sponsor-images",
  operator: "operator-images",
  child: "child-images",
  category: "category-images",
  product: "product-images",
};

const PREFIX_BY_KIND: Record<ImageKind, string> = {
  family: "/api/family-images/files/serve/",
  sponsor: "/api/sponsor-images/files/serve/",
  operator: "/api/operator-images/files/serve/",
  child: "/api/child-images/files/serve/",
  category: "/api/category-images/files/serve/",
  product: "/api/product-images/files/serve/",
};

const REFERENCE_SQL = `
SELECT 'family' AS kind, fp.id::text AS owner_id, u.image AS path
FROM family_profiles fp JOIN users u ON u.id = fp.user_id WHERE u.image IS NOT NULL
UNION ALL
SELECT 'sponsor', sp.id::text, u.image FROM sponsor_profiles sp JOIN users u ON u.id = sp.user_id WHERE u.image IS NOT NULL
UNION ALL
SELECT 'operator', sp.id::text, u.image FROM staff_profiles sp JOIN staff_functions sf ON sf.staff_profile_id = sp.id AND sf.function_key = 'operator' JOIN users u ON u.id = sp.user_id WHERE u.image IS NOT NULL
UNION ALL
SELECT 'child', c.id::text, c.image FROM children c WHERE c.image IS NOT NULL
UNION ALL
SELECT 'category', c.id::text, c.image FROM categories c WHERE c.image IS NOT NULL
UNION ALL
SELECT 'product', p.id::text, p.image_url FROM products p WHERE p.image_url IS NOT NULL
ORDER BY 1, 2, 3`;

function checksum(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function contentUuid(reference: ImageReference, bytes: Uint8Array) {
  const digest = createHash("sha256")
    .update(`${reference.kind}:${reference.ownerId}:image`)
    .update(bytes)
    .digest("hex");
  const variant = ((Number.parseInt(digest[16]!, 16) & 0x3) | 0x8).toString(16);
  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `${variant}${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join("-");
}

function referenceFile(reference: ImageReference, storageBasePath: string) {
  const prefix = PREFIX_BY_KIND[reference.kind];
  if (!reference.path.startsWith(prefix)) return undefined;
  const fileName = decodeURIComponent(reference.path.slice(prefix.length));
  if (!/^[0-9a-f-]{36}\.(?:avif|gif|jpe?g|png|webp)$/i.test(fileName)) {
    return undefined;
  }
  return {
    fileName,
    path: join(storageBasePath, STORAGE_BY_KIND[reference.kind], fileName),
  };
}

async function listReferences(): Promise<ImageReference[]> {
  const result = await pool.query<{
    kind: ImageKind;
    owner_id: string;
    path: string;
  }>(REFERENCE_SQL);
  return result.rows.map((row) => ({
    kind: row.kind,
    ownerId: row.owner_id,
    path: row.path,
  }));
}

async function assertBackup(path: string, label: string) {
  const info = await stat(resolve(path)).catch(() => undefined);
  if (!info) throw new Error(`${label} backup does not exist: ${path}`);
}

async function updateReference(
  reference: ImageReference,
  expectedPath: string,
  nextPath: string,
) {
  const statements: Record<ImageKind, string> = {
    family: "UPDATE users u SET image = $1 FROM family_profiles fp WHERE fp.user_id = u.id AND fp.id = $2 AND u.image = $3 RETURNING u.id",
    sponsor: "UPDATE users u SET image = $1 FROM sponsor_profiles sp WHERE sp.user_id = u.id AND sp.id = $2 AND u.image = $3 RETURNING u.id",
    operator: "UPDATE users u SET image = $1 FROM staff_profiles sp INNER JOIN staff_functions sf ON sf.staff_profile_id = sp.id AND sf.function_key = 'operator' WHERE sp.user_id = u.id AND sp.id = $2 AND u.image = $3 RETURNING u.id",
    child: "UPDATE children SET image = $1, updated_at = NOW() WHERE id = $2 AND image = $3 RETURNING id",
    category: "UPDATE categories SET image = $1, updated_at = NOW() WHERE id = $2 AND image = $3 RETURNING id",
    product: "UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2 AND image_url = $3 RETURNING id",
  };
  const result = await pool.query(statements[reference.kind], [
    nextPath,
    reference.ownerId,
    expectedPath,
  ]);
  if (result.rowCount !== 1) throw new Error(`${reference.kind} reference changed during image backfill`);
}

export async function runImageBackfill(options: {
  apply?: boolean;
  databaseBackupPath?: string;
  manifestDirectory?: string;
  storageBackupPath?: string;
  storageBasePath?: string;
}): Promise<ImageBackfillSummary> {
  const storageBasePath = resolve(options.storageBasePath ?? envConfig.storage.basePath);
  if (options.apply) {
    if (!options.databaseBackupPath || !options.storageBackupPath) {
      throw new Error("Apply mode requires --database-backup and --storage-backup");
    }
    await assertBackup(options.databaseBackupPath, "Database");
    await assertBackup(options.storageBackupPath, "Storage");
  }

  const references = await listReferences();
  const summary: ImageBackfillSummary = {
    referenced: references.length,
    compliant: 0,
    converted: 0,
    exempt: 0,
    missing: 0,
    oldBytes: 0,
    projectedBytes: 0,
    savingsBytes: 0,
  };
  const entries: ImageBackfillManifestEntry[] = [];

  for (const reference of references) {
    const source = referenceFile(reference, storageBasePath);
    if (!source) {
      summary.exempt += 1;
      continue;
    }
    const bytes = new Uint8Array(await readFile(source.path).catch(() => new Uint8Array()));
    if (bytes.byteLength === 0) {
      summary.missing += 1;
      continue;
    }
    summary.oldBytes += bytes.byteLength;
    if (extname(source.fileName).toLowerCase() === ".gif") {
      summary.exempt += 1;
      summary.projectedBytes += bytes.byteLength;
      continue;
    }
    const profile = PROFILE_BY_KIND[reference.kind];
    if (extname(source.fileName).toLowerCase() === ".webp") {
      const compliant = await assertManagedImageCompliant(bytes, profile)
        .then(() => true)
        .catch(() => false);
      if (compliant) {
        summary.compliant += 1;
        summary.projectedBytes += bytes.byteLength;
        continue;
      }
    }

    const normalized = await normalizeManagedImage(bytes, profile);
    summary.projectedBytes += normalized.bytes.byteLength;
    summary.converted += 1;
    if (!options.apply) continue;

    const requestedFileName = `${contentUuid(reference, bytes)}${extname(source.fileName)}`;
    const written = await writeManagedImage({
      bytes,
      directory: join(storageBasePath, STORAGE_BY_KIND[reference.kind]),
      profile,
      requestedFileName,
      reuseExisting: true,
      servePrefix: PREFIX_BY_KIND[reference.kind],
    });
    await updateReference(reference, reference.path, written.path);
    entries.push({
      kind: reference.kind,
      ownerId: reference.ownerId,
      oldPath: reference.path,
      newPath: written.path,
      oldChecksum: checksum(bytes),
      newChecksum: checksum(new Uint8Array(await readFile(written.absolutePath))),
      oldBytes: bytes.byteLength,
      newBytes: (await stat(written.absolutePath)).size,
    });
  }

  summary.savingsBytes = Math.max(0, summary.oldBytes - summary.projectedBytes);
  if (options.apply) {
    const directory = resolve(options.manifestDirectory ?? join(storageBasePath, "operations"));
    await mkdir(directory, { recursive: true });
    const manifestPath = join(directory, `image-backfill-${Date.now()}.json`);
    const manifest: ImageBackfillManifest = {
      version: 1,
      createdAt: new Date().toISOString(),
      storageBasePath,
      entries,
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { flag: "wx" });
    summary.manifestPath = manifestPath;
  }
  return summary;
}

export async function rollbackImageBackfill(manifestPath: string) {
  const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8")) as ImageBackfillManifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.entries)) {
    throw new Error("Unsupported image backfill manifest");
  }
  let restored = 0;
  for (const entry of [...manifest.entries].reverse()) {
    const reference: ImageReference = {
      kind: entry.kind,
      ownerId: entry.ownerId,
      path: entry.newPath,
    };
    const oldFile = referenceFile({ ...reference, path: entry.oldPath }, manifest.storageBasePath);
    if (!oldFile) throw new Error(`Invalid rollback path for ${entry.kind}`);
    const oldBytes = new Uint8Array(await readFile(oldFile.path));
    if (checksum(oldBytes) !== entry.oldChecksum) {
      throw new Error(`Rollback checksum mismatch for ${entry.kind}`);
    }
    await updateReference(reference, entry.newPath, entry.oldPath);
    restored += 1;
  }
  return { restored };
}
