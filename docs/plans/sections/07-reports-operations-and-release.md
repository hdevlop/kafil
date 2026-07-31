# Section 07 - Reports, Operations, and Release

Status: active

## Procurement, Evidence, and Access Extension - Complete 2026-07-27

- [x] Removed low-stock and inventory reconciliation from active reporting.
- [x] Added order actual-cost, receipt marker, purchase, and delivery views.
- [x] Added protected evidence orphan listing/cleanup MCP operations.
- [x] Added admin-only Users, fixed Roles, canonical grant drift, complete
      domain-user onboarding, and audited custom-permission creation.
- [x] Added account deactivate/reactivate/session-revoke audit behavior.
- [x] Added deterministic demo assisted purchase and photo-delivery evidence.
- [x] Updated database/storage backup guidance for order evidence.
- [x] Passed lint, typecheck, unit, build, schema-drift, migration, and
      PostgreSQL concurrency gates; production staging/browser smoke remains a
      separate Phase 7 release gate.

## Staff and Delivery Assignment Extension - Complete 2026-07-30

- [x] Re-audited and repaired the Staff prerequisite around the single
      Operator/Delivery Role, automatic operator provisioning, synchronization,
      sorting, privacy, authorization, and localization.
- [x] Added migration `0027_unusual_victor_mancha` with immutable delivery
      attempts, idempotency uniqueness, lifecycle checks, and one active attempt
      per order.
- [x] Added locked assign/reassign/start/fail/confirm commands and privacy-safe
      audit/outbox metadata without budget or inventory effects.
- [x] Allowed delivery staff to be assigned or reassigned once an order is
      approved so the same staff member can procure and deliver it; starting
      delivery still requires a recorded purchase, and pre-purchase
      cancellation closes the active assignment.
- [x] Added operator current/history projections, family assigned-only milestone,
      and unchanged sponsor-safe milestones.
- [x] Added the Orders Delivery column, command dialogs, and responsive/RTL Najm
      Kit details sheet with immutable history.
- [x] Passed unit, type, lint, production build, PostgreSQL concurrency,
      migration/drift, and admin/operator/family/sponsor browser acceptance.

This extension does not close the remaining observability, staging, security,
and release checklist items in Phase 7.

## Goal

Close the reporting, notification, observability, privacy, recovery, and release
requirements for the first production deployment.

The VPS, Docker, GitHub Actions, demo initialization, and clean real-production
transition handoff is documented in
[`VPS-DOCKER-DEPLOYMENT.md`](../VPS-DOCKER-DEPLOYMENT.md).

## Current Slice - Dashboard Reporting Baseline

Completed on 2026-07-17:

- [x] Reworked the shared role shell with icons, grouped navigation, visible
      section separators, clearer active states, and a distinct account footer.
- [x] Added role-protected read-only dashboard aggregates for operator, family,
      and sponsor views without changing the database schema.
- [x] Added operator KPI cards for people, contributions, budget availability,
      and open orders, plus a 12-month contribution chart, budget breakdown,
      and order pipeline.
- [x] Added family KPI cards, a 12-month order-value chart, household budget
      breakdown, order pipeline, recent orders, and the existing household card.
- [x] Added sponsor KPI cards, own contribution history/trend, privacy-safe
      supported-budget usage, contribution statuses, and recent contributions.
- [x] Preserved role ownership: family aggregates resolve only the authenticated
      household; sponsor aggregates expose only the authenticated sponsor's own
      contribution data and deduplicated support outcomes without household IDs.
- [x] Added English, French, and Arabic labels and retained RTL-aware shell
      behavior.

This slice establishes useful live overview reporting. It does not close the
detailed report, CSV export, outbox delivery, operations, recovery, or release
checklists below.

## Response Contract

Completed on 2026-07-19:

- [x] Upgraded to `najm-core@2.0.2`, which publishes the `@ResMsg()` response
      formatter used by the existing SMS application.
- [x] Applied standard translated response metadata to all 110 Kafil
      controller routes. It produces `{ data, message, status }` everywhere
      except the raw `/system/health` operational probe.
- [x] Added English, French, Arabic, and Spanish response messages; the web
      API client transparently unwraps the new envelope so feature contracts
      remain unchanged.
- [x] Added a server contract test covering all controllers/routes and all
      supported languages.

Validation: `bun run lint`, `bun run typecheck`, `bun run test`,
`bun run db:generate`, and `bun run build` passed. Server tests: 114 passed,
1 database-only test skipped; web tests: 97 passed; seed tests: 10 passed.

## Seed CLI and Demo Image Operations

Completed on 2026-07-20 and extended on 2026-07-21:

- [x] Replaced script-name knowledge with one Clack-powered interactive/direct
      seed CLI for setup, demo, full, migration, auth repair, verification, and
      image checks; full is the highlighted default and demo/full prompt for all
      five account/activity counts.
- [x] Added destructive-command confirmation and an explicit `--yes` automation
      flag for setup/full workflows.
- [x] Added one flat package-owned image library with enforced `family-NN` and
      `sponsor-NN` names plus format, size, and directory validation.
- [x] Assigned each image deterministically to one profile only, left excess
      accounts on their fallback avatar, copied files into managed storage using
      content-versioned UUID paths, and reconciled Najm user images on repeat
      demo runs.
- [x] Added authenticated sponsor-image serving without making the seed source
      folders public.
- [x] Hardened reset and demo removal so full application reset clears every
      mutable managed storage directory, while demo removal also resets every
      product without retained order history and every category left empty.
      Unreferenced UUID-managed profile/catalog images are deleted after
      preserving paths still referenced by the database. Branding remains
      independently managed and is not swept by demo cleanup.
- [x] Updated the current demo defaults to 10 families, 20 sponsors, 6
      operators, 4 dedicated delivery staff, and 20 contributions. Demo/full
      now create or repair the packaged categories plus 18 matching
      image-backed products, then create 24 deterministic repeat-family orders
      across the trailing 12 months through the normal order, purchase, budget,
      and delivery services.

Demo-realism validation (2026-07-30): seed lint and typecheck passed; all 73
seed tests passed, including product idempotency, repeat-family/month coverage,
cleanup of delivery attempts/staff, and chronological non-negative budget
replay. Root typecheck passed, the complete test command passed (web, 308 server
passes with 33 opt-in skips, and 73 seed passes), the 40-route production build
passed, and `bun run db:generate` reported no schema changes. The combined
`bun run check` command remains red only because the concurrent delivery slice
still has an unrelated unused `_actorUserId` lint finding in
`orderService.ts`; no seed lint finding remains.

Cleanup hardening validation (2026-07-29): focused seed lint/typecheck and 9
reset/removal tests passed. The repaired local `seed:remove` command found zero
remaining demo database records, removed 67 unreferenced profile images, and
preserved all 17 database-referenced category images. The isolated-storage root
`bun run check` passed with 276 server tests (27 PostgreSQL-only skips), 71 seed
tests, and a successful 39-route production build; `bun run db:generate`
reported no schema changes.

Catalog-reset extension (2026-07-29): `seed:remove` now also deletes catalog
products without retained order history and every category left empty, then
reports both deletion counts. Cart and legacy-inventory rows for those products
are removed in the same transaction. Historical non-demo order items continue
to protect their referenced products and categories. Seed lint, typecheck, and
all 71 seed tests passed; the root `bun run check` gate and 39-route production
build passed, and `bun run db:generate` reported no schema changes.

## Implemented Slice - Image Delivery Optimization (rollout pending)

The measured oversized-image and cold-load problem is specified in
[`IMAGE-DELIVERY-OPTIMIZATION.md`](../IMAGE-DELIVERY-OPTIMIZATION.md). The plan
keeps protected image routes authenticated, normalizes new uploads and seed
assets into bounded WebP files, backfills existing referenced files safely, and
adds browser transfer budgets. Status: planned; no optimization implementation
has been claimed.

Validation: root lint, typecheck, tests, and production build passed. Test
counts were web 107, server 129 with one opt-in database skip, and seed 27. CLI
help, image-library inspection, configured auth verification, and a zero-record
demo database run passed. Destructive setup/full execution was deliberately not
used for validation; its non-interactive safety rejection was verified instead.

## Accessible Account Access and Email Activation

Completed on 2026-07-20:

- [x] Registered `najm-email@2.0.1` explicitly with environment-backed provider
      configuration and a safe console development default.
- [x] Added email-or-phone login over Najm's existing password, lockout,
      session-cookie, refresh-token, and rate-limit behavior.
- [x] Normalized phone identities into Najm users and backfilled only
      unambiguous existing family, sponsor, and operator profile numbers.
- [x] Added operator-created initial credentials. Families receive the
      surname plus birth year (for example, `Amrani1987`) for an easy first
      login; sponsors keep a random suffix. Only the hash is persisted and the
      operator sees the plaintext once.
- [x] Added guardian date of birth to new family intake while keeping the new
      database column nullable for honest legacy-data migration.
- [x] Added pending public sponsor registration, hashed one-time verification
      tokens, resend behavior, and an email verification page that activates
      the account.
- [x] Added a server-owned first-login requirement for newly operator-created
      families. Login and dashboard navigation lead to a simple multilingual
      password screen; a successful change clears the requirement, revokes all
      sessions, and asks the family to sign in again.
- [x] Limited the easy lowercase-and-number replacement policy to the family
      first-login command. Sponsors, operators, admins, registration, reset,
      and ordinary Najm password changes retain the stronger Najm policy.

The access endpoints are public but validated and rate-limited. Verification
responses and resend behavior avoid exposing whether an arbitrary email exists.

Validation: `bun run check` passed, covering lint, typecheck, web 109 tests,
server 141 tests with one database opt-in skip, seed 31 tests, and the Next.js
production build. `bun run db:generate` reported no schema drift,
`bun run db:migrate` applied the additive migrations, live schema checks found
the verification-token and family-password-requirement tables without legacy
requirement rows, and
`bun run test:db` passed the PostgreSQL concurrency test.

## Installable Mobile Web App

Completed on 2026-07-22:

- [x] Added a Next.js web app manifest with standalone display, branded phone
      icons, a maskable Android icon, and Apple home-screen metadata.
- [x] Registered a production service worker with explicit no-cache headers and
      a static offline fallback.
- [x] Kept API responses and authenticated family/financial pages out of the
      service-worker cache; offline mode never displays stale private data.
- [x] Added automated manifest, icon-dimension, and cache-safety coverage.

Installation requires the deployed application to be served over HTTPS. Android
users can install from the browser's app menu; iPhone users use Share, then Add
to Home Screen.

Validation: `bun run check` passed with web 117 tests, server 141 tests and one
database-only skip, seed 31 tests, and a successful production build. The 6
focused PWA checks passed, `bun run db:generate` reported no schema drift, and a
live production smoke returned `200` for the manifest, service worker, and app
icon with the expected manifest and no-cache service-worker content types and
headers.

## Dynamic Branding Assets

Completed on 2026-07-26:

- [x] Extended `platform_settings` with `sidebar_logo_expanded_path`,
      `sidebar_logo_collapsed_path`, `auth_logo_path`, `auth_hero_image_path`,
      and `branding_revision` (positive-checked) and generated migration
      `0024_bored_ozymandias.sql` (no deployed migration was edited).
- [x] Added a `branding` feature in the settings module with public DTOs, an
      `@Transaction({ retries: 2 })` revision-locked commit, slot/path
      validators, post-commit cleanup of replaced files, and best-effort
      rollback cleanup of new candidates when the commit fails.
- [x] Added admin-only upload, public serve, and admin-only delete
      endpoints with PNG/JPEG/WebP/AVIF magic-number checks, slot-aware byte
      limits (2 MB for logos, 5 MB for the hero), and immutable
      `public, max-age=31536000` cache headers on the serve endpoint.
- [x] Recorded privacy-safe audit metadata
      (`branding.assetsUpdated` and `branding.assetsReset`) with changed slot
      names, the previous and new revisions, and no filesystem paths or image
      bytes.
- [x] Added a `KafilBrandingProvider` plus a server-side loader that falls
      back to the bundled factory assets on any non-OK, malformed, or
      unavailable server response.
- [x] Mounted the new provider between `KafilAppearanceProvider` and
      `KafilDesignProvider`, loaded the initial server-side branding in the
      root layout, and rendered the new `Brand assets` card in the global
      Settings sheet only for admin users; operators keep the existing
      App settings form.
- [x] Replaced the hard-coded `logoExpanded.png`, `HeroA.png`, and first-login
      `logoExpanded.png` references in `DashboardShell`, the auth layout, and
      the first-login layout with a new `BrandingImage` component that
      automatically falls back to the bundled factory asset on any image
      error without flashing custom branding.
- [x] Added English, French, Arabic, and Spanish translations for the new
      settings card and saved/commit/discard toasts.

Validation: `bun run check` passed with web 179 tests (4 new branding tests,
including consumer wiring, factory fallback, and provider integration),
server 257 tests with 20 DB-integration skips (plus a new opt-in
`branding-database-concurrency.test.ts` that asserts exactly one revision
winner for a shared expected revision), seed 60 tests, and a successful
production build. `bun run db:generate` reported no schema drift. The
branding server loader's factory fallback is exercised in the build when
the database is unreachable.

Follow-up review on 2026-07-26 hardened the editor model and UI:

- Added an admin-only `GET /branding/config` projection that returns both the
  committed `customPath` and the resolved `path` per slot so the draft can
  represent a slot as "inherit from expanded" without resolving it to a
  factory file URL.
- Fixed a critical bug where the save-failure cleanup deleted any submitted
  managed upload, including paths that were still committed. The new cleanup
  keeps every path that matches the previous committed value and only removes
  the new candidates that the commit failed to land.
- Added a `DELETE /branding/assets` admin endpoint and a `cancelDraft` path
  on the provider that always delete orphan candidates from managed storage
  on a discarded draft, not just on a successful close.
- The brand assets card now renders one compact row per slot with a
  `Default` / `Inherited` / `Custom` / `Custom (new)` status badge, an
  explicit `Use default` or `Use expanded` fallback action, and a per-slot
  revert action. The accepted formats, size limits, and per-slot ratio are
  declared once. The card is hidden for non-admins; the redundant `Remove`
  and nested `Discard brand draft` controls were removed in favor of the
  sheet-level dirty-close confirmation. The sheet's `Save` button is now
  disabled while any branding upload is in flight.

## Reports

Operator reports:

- active/inactive family and sponsor counts
- active support assignments
- pending/validated/rejected contributions
- credited, reserved, spent, refunded, and available budget totals
- monthly budget activity by family
- order counts and value by status
- estimated-versus-actual purchase and delivery report
- protected-evidence orphan report
- reconciliation exceptions

Sponsor reports:

- own total contributions
- monthly and one-time contribution history
- supported-family usage summaries
- privacy-safe supported-family order history

Family reports:

- monthly budget statement
- order history and spending by category

### Dashboard baseline evidence

- Web and server lint: passed.
- Web and server TypeScript checks: passed.
- Web feature suite: 86 passed, including 3 focused dashboard
  navigation/translation tests.
- Server suite: 100 passed and 1 skipped, including the 3 focused dashboard
  endpoint, numeric-normalization, and sponsor-privacy tests. Because Bun
  1.3.14 does not apply the required Najm legacy-decorator transform directly
  in `bun test`, the package test command now compiles with TypeScript before
  executing the emitted tests with Bun.
- PostgreSQL concurrency integration: 1 passed, proving competing reservations
  still serialize without overspending budget or stock.
- Production build: passed with all operator, family, and sponsor overview
  routes compiled.
- Browser workflows: 4 passed, covering Arabic/RTL family ordering, operator
  fulfillment, sponsor contributions, and cross-role URL/API denial. The runner
  now owns and terminates its Next.js process explicitly on Windows and removes
  isolated browser users after the suite.

Exports:

- explicit permission
- server-generated
- privacy-filtered DTOs
- CSV formula-injection protection
- audit event for every export

## Durable Outbox

### `outboxEvents`

- `id` UUID primary key
- `topic`
- `aggregateType`
- `aggregateId`
- `payload` JSONB without secrets
- `status`: `pending`, `processing`, `sent`, `failed`
- `attempts`
- `availableAt`
- `processedAt` nullable
- `lastError` nullable and sanitized
- timestamps

Business transactions insert outbox rows in the same commit. A scheduled
processor sends:

- family activation/invitation
- sponsor registration/onboarding
- contribution submitted/validated/rejected/refunded
- monthly contribution reminders
- order approved/rejected/preparation/delivered/cancelled

Retries use backoff and idempotent provider keys. A permanently failed
notification never changes financial truth.

## Operations and Security

Deployment infrastructure implementation (2026-07-22, activation pending):

- [x] Added a database-aware `/api/system/readiness` probe with privacy-safe
      failure output and focused success/failure coverage.
- [x] Added pinned Bun Docker build, production Compose topology, Caddy config,
      immutable-image deployment/verification scripts, pinned-SHA GitHub
      Actions workflow, protected environment examples, and operations and
      recovery runbooks.
- [x] Included the workspace `tsconfig.base.json` in the final image so
      one-shot seed commands retain the legacy decorator transform while
      importing server TypeScript source. The isolated runtime-layout import
      reproduced the old failure without the file and passed after the fix;
      the actual Docker image build remains a deployment-side gate.
- [~] The audited VPS already has host Caddy on 80/443, so the safe documented
      integration uses a loopback-only Kafil port and preserves the existing
      site. Activation awaits hostname/DNS, credentials, restricted deploy
      access, and explicit approval.
- [ ] Redis application integration, off-VPS backup execution, isolated restore,
      HTTPS smoke, deployment rollback rehearsal, and demo initialization have
      not been claimed or performed.

- Add database readiness check in addition to liveness.
- Add metrics for request count/duration and domain queue sizes.
- Preserve/request global request IDs.
- Use structured logs with actor/resource IDs, never tokens or raw private
  payloads.
- Configure production Redis for auth blacklist/session invalidation and
  distributed rate limits.
- Rate-limit auth, contribution submission, order submission, exports, and
  expensive reports.
- Add HTTPS-only cookies and trusted proxy configuration.
- Add Content Security Policy and other security headers.
- Restrict document/storage access with ownership policies.
- Define retention for audit, documents, and exports.
- Review every sponsor response for privacy leakage.
- Review dependencies and production environment variables.

## Backup and Recovery

Document and rehearse:

- automated PostgreSQL backups
- restore into an isolated environment
- migration forward procedure
- failed-migration recovery
- application rollback compatibility
- ledger reconciliation after recovery
- Redis/cache loss behavior
- email/outbox replay
- emergency account deactivation

## Test Matrix

Required final suites:

- all unit and integration tests
- migration from empty database
- migration from previous release database
- seed idempotency and verification
- role/permission matrix
- row ownership with multiple families/sponsors
- contribution idempotency and concurrency
- budget reconciliation
- purchase/evidence reconciliation
- full order state machine
- privacy snapshot tests
- browser end-to-end workflows
- accessibility checks
- production build and runtime smoke
- backup/restore rehearsal

## Release Checklist

- [ ] All phase exit gates closed with evidence
- [ ] No destructive migration of historical money/order data
- [ ] Staging uses production-like PostgreSQL, Redis, and email transport
- [ ] Secrets are strong and stored outside source control
- [ ] HTTPS and secure cookies verified
- [ ] Monitoring and alerts configured
- [ ] Database backup and restore verified
- [ ] Reconciliation reports show no unexplained differences
- [ ] Privacy and authorization review signed off
- [ ] Operator runbook completed
- [ ] Rollback procedure tested
- [ ] Release version and migration list recorded

## Final Verification Commands

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
bun run db:migrate
bun run seed -- setup --yes
bun run seed -- verify
bun run seed -- images
```

Then run role-specific browser tests and smoke:

```text
/                         -> 200
/dashboard                -> role-aware result
/api/system/health        -> 200
/api/mcp/tools            -> expected complete tool list
```

## Exit Gate

The MVP may ship only when all release checklist items are complete, staging
supports the three end-to-end role stories, financial and purchase/evidence
reconciliation are clean, and restore/rollback procedures have been proven.
