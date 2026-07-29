# Image Delivery Optimization Plan

Status: **implemented and backfilled; browser performance evidence pending**

Owner phase: Phase 7 - Reports, Operations, and Release

Last updated: 2026-07-29

## 1. Goal

Make Kafil images load quickly on mobile and desktop without weakening the
existing authentication and privacy boundaries.

The MVP solution is upload-time normalization: decode each managed image once,
strip metadata, resize it to a bounded resolution, encode it as WebP, and store
that small immutable file. Protected images continue to be served through
authenticated Kafil API routes. Public static and branding images may use the
Next.js image optimizer.

This plan deliberately does not introduce S3, a CDN, a dynamic thumbnail
service, image blobs in PostgreSQL, or multiple derivatives per image. Those
options remain future scale work if measured production traffic requires them.

## 2. Confirmed Baseline

Measured in the current checkout after orphan profile-image cleanup:

| Source | Images | Total | Average | Largest |
| --- | ---: | ---: | ---: | ---: |
| `apps/web/public` | 19 | 5.58 MB | 300.6 KB | 2.21 MB |
| `packages/seed/images` | 71 | 126.38 MB | 1.82 MB | 2.73 MB |
| active `storage/category-images` | 17 | 32.17 MB | 1.94 MB | 2.73 MB |
| `storage/branding` | 5 | 3.04 MB | 623 KB | 1.68 MB |

The previous populated demo contained profile and category PNGs between roughly
1 MB and 2.7 MB, commonly 1024-1536 pixels wide, even when rendered as 48-120
pixel cards or avatars.

Confirmed causes:

- Family, sponsor, operator, child, category, and product upload controllers
  accept files up to 5 MB and write the submitted bytes unchanged.
- Demo and category seed workflows copy package images unchanged into managed
  storage.
- Twelve current frontend image uses explicitly set `unoptimized`; therefore
  their `sizes` declarations do not cause Next.js to resize or re-encode the
  source.
- The protected API routes need direct browser loading because the Next.js
  default image optimizer does not forward authentication headers to its
  source request.
- Large fallback and hero PNGs are committed under `apps/web/public`.
- No automated transfer-size or decoded-dimension budget currently blocks a
  regression.

The immutable cache headers are already useful and should remain. They improve
repeat visits but cannot fix the oversized first transfer.

## 3. Locked Technical Decisions

1. Keep protected images protected. Do not expose family, child, sponsor,
   operator, catalog, receipt, or delivery storage as a public filesystem.
2. Normalize new managed images on the server. Client-side compression may be
   added later only to improve upload time; it is not a security or correctness
   boundary.
3. Store one bounded WebP per logical image for the MVP. Cards, tables, and
   details share it.
4. Keep the existing database string-path columns and content-versioned URL
   behavior. No schema migration is expected.
5. The upload response becomes authoritative for the final path. Frontend
   upload clients must consume the returned `path` because the server may
   change the requested extension to `.webp`.
6. Keep `unoptimized` on authenticated sources. Remove it only from public
   sources that the Next.js optimizer can fetch without cookies or tokens.
7. Strip EXIF and other metadata from managed photos, apply EXIF rotation before
   resizing, and reject decoded pixel bombs even when compressed input is under
   5 MB.
8. New animated GIF uploads are out of scope and should be rejected with clear
   form/API validation. Existing GIF paths remain readable during migration.
9. Receipts, PDFs, and delivery evidence are excluded. Their fidelity and
   retention rules are owned by the protected evidence workflow.
10. Add `sharp` as an explicit `packages/server` dependency. Do not rely on
    Next.js having installed it transitively.

## 4. Output Profiles and Budgets

All limits are output targets after decoding, orientation, metadata stripping,
resizing with aspect ratio preserved, and WebP encoding. Processing must fail
closed if a target cannot be produced safely.

| Asset class | Maximum dimensions | WebP quality | Target bytes |
| --- | ---: | ---: | ---: |
| family/sponsor/operator/child photo | 640 x 640 bounding box | 80 | <= 150 KB |
| category/product image | 1280 x 1280 bounding box | 82 | <= 200 KB |
| branding logo | 1024 x 512 bounding box | 85 | <= 150 KB |
| branding hero | 1920 x 1280 bounding box | 82 | <= 350 KB |
| bundled person fallback | 512 x 512 bounding box | 80 | <= 100 KB |
| bundled auth/landing hero | 1920 x 1280 bounding box | 82 | <= 350 KB |

Input boundaries:

- accepted inputs: PNG, JPEG, WebP, and AVIF;
- compressed input maximum remains 5 MB unless a stricter branding slot already
  applies;
- decoded dimensions maximum: 8192 pixels on either axis;
- decoded area maximum: 24 megapixels;
- output MIME, extension, and magic bytes must agree;
- alpha transparency must be preserved for logos and supported images.

Cold-load page budgets:

- no individual delivered UI image above 350 KB;
- 20 profile cards at or below 3 MB total image transfer;
- the complete active category grid at or below 3.5 MB total image transfer;
- auth logo plus hero at or below 500 KB total source transfer;
- warm reloads must use immutable browser/optimizer caching for unchanged URLs.

These are release gates, not suggestions. Tighten them after real device
measurements; do not loosen them merely to accept an oversized fixture.

## 5. Target Architecture

```text
PNG/JPEG/WebP/AVIF upload
          |
          v
shared managed-image processor
  - verify decoded format and dimensions
  - apply orientation
  - strip metadata
  - resize to the asset profile
  - encode bounded WebP
          |
          v
UUID.webp written atomically to KAFIL_STORAGE_PATH
          |
          +-- protected API serve route -> direct browser image request
          |
          `-- public branding route -> Next.js optimizer where safe
```

Implement the processor as one server-owned helper with explicit profiles and
tests. Feature controllers remain responsible for authorization, route
messages, and mapping the returned managed path into their current command
flows. Seed code must call the same processor instead of maintaining a second
encoding implementation.

Use atomic candidate writes. A failed decode/encode must leave no final file.
Replacement flows update the database first and delete the old file only after
the owning command commits, matching Kafil's existing storage safety rule.

## 6. Implementation Slices

### Slice A - Processor and contracts

- [x] Add explicit `sharp@0.34.5` ownership to `packages/server`.
- [x] Add a shared managed-image processor with the profiles and limits above.
- [x] Verify magic bytes by successful decoding; do not trust extension or
      `Content-Type` alone.
- [x] Enforce byte budgets deterministically: encode at the profile quality,
      retry down to an approved quality floor, then reduce dimensions within
      the same aspect ratio; reject the upload if it still exceeds its budget.
- [x] Produce server-owned `.webp` filenames and immutable paths.
- [x] Keep existing serve routes compatible with current PNG/JPEG/WebP/AVIF/GIF
      files while new uploads become WebP.
- [x] Add unit tests for orientation, aspect ratio, alpha, metadata removal,
      byte/dimension limits, malformed input, pixel bombs, and atomic failure.

Exit gate: processor tests prove every profile stays within its dimension and
byte budget using representative fixtures.

### Slice B - Protected profile and catalog uploads

- [x] Route family, sponsor, operator, child, category, and product uploads
      through the shared processor.
- [x] Return the actual normalized path from each upload endpoint.
- [x] Change every frontend upload service to use the response `path` instead
      of reconstructing a filename locally.
- [x] Remove GIF from the corresponding form accepts and API allowlists while
      retaining legacy serve support.
- [x] Preserve upload-first candidate cleanup when a later entity command
      fails.
- [x] Audit the image-viewer role matrix against actual consumers. In
      particular, family catalog users must be able to retrieve permitted
      category/product images, while sponsor/family privacy projections must
      not gain access to raw household or child photos.
- [x] Add allowed/forbidden role tests for protected serve-route role and ownership boundaries.

Exit gate: new uploads are bounded WebP files, frontend records the returned
path, all authorized roles can render their images, and forbidden roles remain
denied.

### Slice C - Seed and bundled assets

- [x] Make demo profile and category seeding call the shared processor rather
      than `copyFile`.
- [x] Convert the package-owned seed library to WebP so the repository and
      Docker image no longer carry 126 MB of oversized PNG fixtures.
- [x] Preserve family/sponsor/child classification, deterministic assignment,
      and content-versioned filenames.
- [x] Convert oversized public fallbacks, logos, and heroes to bounded WebP or
      static imports and update all references/tests.
- [x] Keep PWA icon requirements in PNG where the manifest/platform requires
      PNG; optimize those PNGs losslessly instead of changing their format.

Exit gate: `bun run seed -- images` validates every packaged asset, demo seeding
creates only bounded runtime images, and public assets meet their budgets.

### Slice D - Public Next.js optimization and rendering

- [x] Add one shared protected-image wrapper that owns direct authenticated
      loading, `unoptimized`, error fallback, and safe lazy-loading defaults.
- [x] Replace feature-level raw protected `<Image>` usage with that wrapper.
- [x] Keep protected `/api/*-images/files/serve/*` sources direct and
      `unoptimized`.
- [x] Allow Next.js optimization for bundled static images and public branding
      assets only.
- [x] Add strict `images.localPatterns` entries if the final public source paths
      require configuration; do not add broad remote hosts.
- [x] Keep content-versioned immutable source URLs and an appropriate optimizer
      TTL.
- [x] Verify `sizes` for cards, grids, detail views, cart thumbnails, logos, and
      heroes against actual responsive layout widths.
- [x] Use lazy loading for offscreen list/grid images. Preload only the measured
      LCP hero or logo, never every card.
- [x] Keep width/height or `fill` containers stable to prevent layout shift.

Exit gate: browser network evidence shows protected images load directly as
small sources, public images use responsive optimizer URLs, and no list/grid
eager-loads all images.

### Slice E - Existing-data backfill

- [x] Add an operations command with dry-run and explicit apply modes that
      inventories referenced managed images and reports projected savings.
- [x] Cover user profile paths, child paths, categories, products, and committed
      branding paths. Never infer ownership from directory contents alone.
- [x] Require PostgreSQL and storage backups before apply mode.
- [x] For each record: create the normalized candidate, verify it, update the
      database reference through its feature-owned contract, then retain the
      old source as an unreferenced rollback candidate until the release window
      closes. Branding updates must preserve its revision-lock behavior.
- [x] Emit a local rollback manifest containing old/new paths and checksums but
      no private image bytes or identity data.
- [x] Make reruns idempotent and skip already-compliant WebP files.
- [ ] Run the existing orphan cleanup only after backfill verification and the
      rollback-retention window.

Deployment order:

1. deploy backward-compatible serve/upload code;
2. back up database and storage;
3. run inventory/dry-run and review counts;
4. run apply during a maintenance window with uploads disabled;
5. smoke all roles and compare transfer budgets;
6. retain backups, old unreferenced files, and the rollback manifest through
   the release window;
7. remove the retained old files only after rollback authority closes the run.

Exit gate: every live database path resolves, no protected projection changes,
the backfill is idempotent, and rollback has been rehearsed against an isolated
restore.

### Slice F - Performance and regression gates

- [x] Add source tests that forbid unmanaged `unoptimized` usage outside an
      explicit protected-image wrapper or approved exception.
- [x] Add seed tests that reject packaged assets exceeding their profile budget.
- [x] Add browser tests that capture image response status, MIME, transfer size,
      caching, lazy loading, and cross-role denial.
- [ ] Measure cold and warm loads for operator categories/families, family
      catalog/cart, sponsor support, auth, and branding settings.
- [ ] Record desktop and throttled-mobile totals in this plan before closure.
- [ ] Run the full gate with an isolated `KAFIL_STORAGE_PATH`.

Final verification:

```bash
bun run --cwd packages/server lint
bun run --cwd packages/server typecheck
bun run --cwd packages/server test
bun run --cwd packages/seed lint
bun run --cwd packages/seed typecheck
bun run --cwd packages/seed test
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run build
bun run check
bun run db:generate
```

Run the image backfill dry-run, isolated apply/rollback rehearsal, and
role-specific browser workflows in addition to the code gate.

## 7. Required Evidence

Close this plan only with:

- before/after file count, total bytes, average bytes, and maximum bytes for
  public, seed, and each runtime image directory;
- before/after cold and warm browser transfer totals for each target route;
- decoded dimensions and MIME samples from every asset profile;
- allowed/forbidden image-route role matrix results;
- dry-run/apply/idempotency/rollback results for the backfill;
- confirmation that original protected paths are absent from sponsor/public
  DTOs, logs, audit metadata, and outbox payloads;
- full command results and explicit database migration status.

## 8. Implementation Evidence (2026-07-29)

Code and packaged-asset evidence:

| Source | Before | After | Largest after |
| --- | ---: | ---: | ---: |
| `apps/web/public` UI/PWA images | 19 files / 5.58 MB | 14 files / 502,946 bytes | 98,665 bytes |
| `packages/seed/images` | 71 files / 126.38 MB | 71 files / 4,903,938 bytes | 198,006 bytes |

- `bun run seed:images`: passed all 71 packaged WebP profile checks.
- `bun run images:backfill` dry run: 20 references, 0 missing, 0 exempt,
  35,165,094 current bytes, 3,057,878 projected bytes, and 32,107,216
  projected bytes saved.
- `bun run check`: passed; web 210 tests, server 288 passed / 27 opt-in
  database tests skipped, seed 71 tests, and the production build passed.
- `bun run db:generate`: no schema changes and nothing to migrate.
- `KAFIL_E2E_GREP='protected images|public auth branding' bun run --cwd
  apps/web test:e2e`: 2 passed. The browser verified all 18 category responses
  were WebP, individually at or below 200 KB, collectively at or below 3.5 MB,
  immutable-cached and lazy-loaded; it also verified sponsor denial and public
  auth branding through responsive `/_next/image` URLs below 500 KB.
- The browser spec now follows the visible shared `/categories` navigation
  instead of the legacy `/operator/categories` redirect, preserving its
  authenticated client session during the measurement.
- The maintenance-window apply ran after the development server was stopped and
  verified backups were created under
  `C:\Users\hdevlop\Desktop\kafil-backups\image-backfill-20260729-142358`:
  `database.dump` (214,222 bytes) and `storage-snapshot` (7,686,904 bytes).
- Apply inventoried 78 references: 62 were already compliant, 3 branding
  images were converted, 13 non-managed paths were explicitly exempt, and 0
  files were missing. Managed referenced bytes fell from 5,930,400 to
  4,649,852, saving 1,280,548 bytes.
- The rollback manifest is
  `storage/operations/image-backfill-1785331460835.json`. It records the three
  converted branding references and checksums without embedding private image
  bytes. Original files and both backups remain retained for rollback.
- The post-apply dry run was idempotent: 78 references, 65 compliant, 0
  conversions, 13 explicit exemptions, 0 missing, and 0 projected savings.
- Current managed references include 18 category images, 20 sponsor images, 2
  child images, and 3 branding images, all compliant WebP. Product upload,
  serving, and rendering paths use the same catalog profile; the current data
  set has no referenced product image requiring conversion.
- The development server was restarted after apply and `/login` returned HTTP
  200. Orphan cleanup remains deferred until the rollback-retention window
  closes, and rollback has not yet been rehearsed against an isolated restore.

## 9. Done Definition

- [x] Every new managed UI image is normalized server-side.
- [x] Existing referenced UI images are backfilled or explicitly exempted.
- [x] Seed and public assets meet their budgets.
- [x] Protected routes retain current privacy and authorization boundaries.
- [ ] All target pages meet cold-load image budgets on throttled mobile.
- [ ] Warm loads prove immutable caching.
- [x] No schema change is generated unless this plan is deliberately revised.
- [ ] Backup, apply, verification, and rollback procedures are documented and
      rehearsed.
- [x] Root verification passes.
- [ ] Production browser workflows pass.
