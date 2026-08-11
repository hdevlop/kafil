import { storage } from "najm-storage";

import { isAdmin } from "./authConfig";
import { envConfig } from "./envConfig";

/**
 * `najm-storage`, registered because `najm-theme`'s `assetUploads` resolves it
 * from the container by symbol.
 *
 * Kafil's own managed images — family, sponsor, child, catalog, order evidence
 * — still go through `storage/managedImages.ts` and its protected delivery
 * routes. This plugin exists for branding assets, which `najm-theme` reads and
 * writes through the storage *service*; it never sends a browser to the generic
 * controller below.
 *
 * So the generic REST surface is closed to everyone but an administrator. It is
 * new API on a product that had none, and opening it to every authenticated
 * user would publish a file browser across the whole `/storage` namespace set —
 * including the branding namespace — to families and sponsors.
 *
 * `basePath` is Kafil's existing storage root, not the plugin's `"storage"`
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
