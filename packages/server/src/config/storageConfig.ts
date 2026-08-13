import { storage } from "najm-storage";

import { isAdmin } from "./authConfig";
import { envConfig } from "./envConfig";

/**
 * `najm-storage`, registered because `najm-theme`'s `assetUploads` resolves it
 * from the container by symbol.
 *
 * Kafil's own managed images - family, sponsor, child, catalog, order evidence
 * - still go through `storage/managedImages.ts` and feature-owned delivery
 * routes. This plugin exists for branding assets, which `najm-theme` reads and
 * writes through the storage service.
 *
 * The generic REST surface stays closed to everyone but an administrator. Its
 * wildcard routes are registered after Kafil's exact managed-image routes in
 * `server.ts`, so it cannot intercept those feature-owned contracts.
 *
 * `basePath` is Kafil's existing storage root, not the plugin's `storage`
 * default: the default is relative to `process.cwd()`, which is `apps/web` at
 * runtime, and would put branding assets somewhere no backup or deployment
 * mount knows about.
 */
export const storageConfig = () =>
  storage({
    provider: "local",
    basePath: envConfig.storage.basePath,
    guards: [isAdmin()],
    servePrefix: "/api",
    mcp: false,
    studio: false,
  });
