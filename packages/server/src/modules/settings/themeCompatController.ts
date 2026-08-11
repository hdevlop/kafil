import { Controller, Delete, Get, Params, Post } from "najm-core";

/**
 * Temporary redirects from Kafil's retired theme paths to the `najm-theme`
 * canonical ones.
 *
 * **Remove these with the legacy column drop** — root `PLAN.md` Phase 5. They
 * exist for the rollback window only, so a bookmark, a cached document, or a
 * client that has not been redeployed does not 404 mid-cutover.
 *
 * They are redirects, not handlers: there is exactly one authoritative write
 * path and it is the package's. Nothing here reads or writes state, so nothing
 * here can drift from the route it points at.
 *
 * Unguarded on purpose. A redirect discloses a path Kafil already documents,
 * and the target route runs the real authorization — guarding the redirect
 * would turn a 401 at the destination into a 401 at the signpost, which is the
 * same answer from a less useful place.
 */

function redirect(location: string, status: 307 | 308): Response {
  return new Response(null, { status, headers: { location } });
}

@Controller("/theme-presets")
export class ThemePresetCompatController {
  /** `GET /api/theme-presets` → `GET /api/presets`. */
  @Get("/")
  listPresets(): Response {
    return redirect("/api/presets", 308);
  }

  /** 307 preserves the method and the body; 308 would too, but 307 is the
   * honest status for a route that is going away rather than moving forever. */
  @Post("/")
  createPreset(): Response {
    return redirect("/api/presets", 307);
  }

  @Post("/:id/apply")
  applyPreset(@Params("id") id: string): Response {
    return redirect(`/api/presets/${encodeURIComponent(id)}/apply`, 307);
  }

  @Delete("/:id")
  deletePreset(@Params("id") id: string): Response {
    return redirect(`/api/presets/${encodeURIComponent(id)}`, 307);
  }
}

@Controller("/branding/assets")
export class BrandingAssetCompatController {
  /**
   * `GET /api/branding/assets/serve/:fileName` → `/api/branding/assets/:fileName`.
   *
   * Every committed branding path stored before the cutover carries the
   * `/serve/` segment, and those paths are cached by browsers for a year under
   * `immutable`. The backfill rewrites the database, but not a cache.
   */
  @Get("/serve/:fileName")
  serveAsset(@Params("fileName") fileName: string): Response {
    return redirect(
      `/api/branding/assets/${encodeURIComponent(decodeURIComponent(fileName))}`,
      308,
    );
  }
}
