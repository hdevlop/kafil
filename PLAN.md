# Kafil Remaining Work Plan

Status: **ACTIVE**

Last updated: 2026-08-09

This plan replaces the previous root plan. It is the sole roadmap for the
current worktree: there is no required companion pagination plan. Completed
history is deliberately omitted; the baseline below records only implementation
that is already present and still needs acceptance evidence.

## Verified baseline

- Root and web manifests, `bun.lock`, and the installed package resolve
  `najm-kit@2.9.0`. Do not use the superseded `2.1.56` or `2.7.3` baselines.
- Branding already uses Najm Kit `ImageInput`; Kafil's old
  `BrandingAssetPreview` is gone. The server owns managed branding storage,
  safe fallback projection, MIME validation, and raw-byte asset delivery.
- Local reusable dashboard chart components are gone. Admin, Family, and
  Sponsor dashboards consume Najm Kit chart exports and one shared dashboard
  skeleton composition.
- The current source contains an in-progress move of list surfaces to Najm Kit
  pagination/query helpers. Preserve unrelated changes while completing or
  reviewing that migration.
- Evidence recorded on this worktree before this plan was written:
  - focused web branding/chart/pagination tests: 59 pass, 0 fail;
  - server unit suite: 397 pass, 48 PostgreSQL-gated skips, 0 fail.
- These results prove source-level behavior only. They do not replace the
  browser, PostgreSQL, production-runtime, GitHub, or deployment gates below.

## Scheduled companion work

Three bounded plans are owned outside this file. None renumbers a phase here,
and none may absorb another plan's moves.

- `AUTH-COOKIE-PLAN.md` owns the credential-setup and cookie migration. Its
  status is recorded in Phase 4 below; nothing in this section changes it.
- `AUTH-SESSION-PLAN.md` owns the shared React Server Component session
  adapter across Najm, Kafil, and School.
- `UI-BOOTSTRAP-PLAN.md` owns the shared Najm Kit server appearance and
  branding bootstrap, its publication, Kafil adoption, and adoption by the
  second consumer. Kafil's adoption must finish before Phase 2 acceptance.

Kafil's share of the session plan is its Move 3, scheduled here and executed
against the published `najm-auth@3.1.0`:

- [x] Pin `najm-auth@3.1.0` in the root override and the web, server, and seed
  manifests, resolving to one version in `bun.lock`.
- [x] Replace `apps/web/src/lib/session.ts` with one `createReactServerAuth(auth)`
  singleton, keeping `server-only` and the `getSession` / `requireSession` /
  `requireRole` exports the routes already import.
- [x] Drop the local `React.cache`, redirect, role-fallback, and error-handling
  logic that `najm-auth` now owns, restoring its strict guard semantics: a
  configuration or recovery failure is a visible error, not a login redirect.
- [x] Keep `apps/web/src/lib/auth.ts` proxy-safe and `apps/web/src/proxy.ts`
  reaching only the core auth object.
- [x] Cover the package-owned boundary in `apps/web/test/server-session.test.ts`.
- [ ] Browser acceptance for the flows listed in `AUTH-SESSION-PLAN.md` §6.

Kafil's share of the UI bootstrap plan is its Move 4, scheduled here and
executed against the published `najm-kit@2.9.0`. It must close before the
Phase 2 gate below:

- [x] Pin `najm-kit@2.9.0` in the root override, the root dependency, and the
  web manifest, resolving to one version in `bun.lock`.
- [x] Replace `apps/web/src/lib/loader.ts` with one module-level
  `createReactServerUiBootstrap()` instance in `serverLoader.ts`, keeping
  `server-only` and the `loadServerUiBootstrap` / `loadServerAppearance` /
  `loadServerBranding` exports the layouts already import.
- [x] Keep the lazy internal `server.fetch()` binding, the endpoint paths, the
  factory theme and assets, the strict appearance validator, and the full
  public branding parser application-owned in `apps/web/src/lib/uiResources.ts`.
- [x] Move the generic loading, envelope, fallback, and parallel-composition
  tests to Najm Kit; keep focused Kafil tests for configuration, the four
  branding slots, factory assets, diagnostics, and layout integration.
- [x] Generate no database migration.
- [ ] Browser acceptance for the flows listed in `UI-BOOTSTRAP-PLAN.md` §7,
  folded into the Phase 2 browser pass below.

School's Moves 4–5 of both companion plans are executed from that repository's
own `NAJM-UPGRADE-PLAN.md` and are not tracked here. The UI bootstrap plan's
Move 5 additionally requires a public appearance and branding backend that
School does not have; building it is an app-owned move there, not a reason to
widen Najm Kit.

## Phase 1 — Finish server-backed list pagination

Goal: every interactive list must have correct server-owned pagination in both
table and card modes, with no data ceiling or privacy-scope mixing.

- [ ] Inventory Sponsors, Families, Contributions, Orders, Products,
  Categories, Support Assignments, Staff, Children, Applicants, and Admin
  Users: endpoint, default page size, filters, sorting, desktop navigation,
  and card/mobile continuation.
- [ ] Review the current `useResponsiveOffsetList` migration before treating
  any uncommitted change as complete. Keep `najm-kit/query` and
  `najm-kit/pagination` as the shared boundary; do not restore deleted Kafil
  pagination helpers or add another app-local paginator.
- [ ] Ensure every server endpoint applies authorization, identity scope,
  search, filters, and sort before `limit`/`offset`, and returns an accurate
  total or explicit continuation metadata.
- [ ] Remove every remaining first-100, all-pages, or inferred-next-page list.
  Exact page-size boundaries must not fabricate or hide a next page.
- [ ] Ensure role/identity/filter/sort changes reset accumulated cards, and
  mutations invalidate affected pages without stale, missing, or duplicate
  rows.
- [ ] Replace large list/form lookups with server search unless their small
  bound is documented and tested.
- [ ] Confirm card pagination has no permanent empty footer, correctly reports
  loaded counts, supports retry after append failure, and respects the Kit's
  current height behavior without Kafil-only CSS workarounds.
- [ ] Add focused client and server tests for 0, 1, page-size minus 1, exact
  page size, page-size plus 1, multiple pages, filter changes, and mutation
  invalidation.
- [ ] Browser-check each affected role surface on phone, tablet, desktop, and
  Arabic RTL, including keyboard focus, action menus, loading, append, failure,
  and retry.

Phase 1 gate:

- [ ] Every interactive list is bounded and server-backed.
- [ ] No privacy projection or authorization boundary changes during paging.
- [ ] Source, browser, and exact-boundary evidence is recorded at one commit.

## Phase 2 — Complete branding asset acceptance

Goal: prove the existing branding implementation works from storage through all
runtime consumers, not merely through source tests.

- [ ] Record configured path, resolved path, fallback, and draft state for
  expanded sidebar logo, collapsed sidebar logo, authentication logo, and
  authentication hero.
- [ ] Verify factory assets are included in a production build and decode with
  the expected image formats and dimensions.
- [ ] Exercise the public stored-asset route for every supported format:
  raw bytes, exact MIME, immutable cache header, invalid filename, and missing
  asset response.
- [ ] Browser-test upload, immediate preview, save, reload, replace, revert,
  clear to fallback, and restart for all four slots.
- [ ] Verify unavailable or undecodable assets show localized recovery UI,
  never a broken native image icon or generic preview text.
- [ ] Verify Settings, expanded/collapsed sidebar, auth, and first-login
  layouts all consume the same server-resolved branding contract.
- [ ] Run desktop, mobile, and Arabic RTL checks, then the branding PostgreSQL
  revision-concurrency test against the intended test database.

Phase 2 gate:

- [ ] Brand assets survive reload and production-style restart.
- [ ] Missing assets fail safely and recoverably.
- [ ] Authorization, upload limits, cleanup, localization, and caching are
  proven by focused tests and browser evidence.

## Phase 3 — Complete Kit dashboard chart and skeleton acceptance

Goal: validate the existing Najm Kit adoption visually and behaviorally across
all dashboard roles.

- [ ] Confirm Kafil contains only domain adapters, localized month labels, and
  value formatters; reusable bar, line, pie, donut, status, legend, SVG, and
  responsive chart rendering must remain in `najm-kit`.
- [ ] Verify Admin, Family, and Sponsor chart cards retain all twelve monthly
  points without horizontal overflow at 320–430 px, tablet, desktop, and Arabic
  RTL widths.
- [ ] Verify `chart-1` through `chart-5` update bar, line, pie, donut, and
  status charts during unsaved Theme Customizer previews, save, reload, reset,
  import, light mode, dark mode, and per-mode overrides.
- [ ] Check zero, empty, single-point, multi-series, more-than-five-series,
  loading, error, keyboard, focus, and reduced-motion states.
- [ ] Verify the shared skeleton composition matches each loaded card's header,
  grid span, approximate height, and responsive footprint without nested card
  surfaces or cumulative layout shift.
- [ ] Add or update focused frontend tests for the verified contracts and
  capture browser evidence for every role.

Phase 3 gate:

- [ ] No Kafil-owned reusable chart implementation remains.
- [ ] Chart colors inherit the active saved appearance by default in both modes.
- [ ] Every dashboard card has a shape-matched shared loading state.
- [ ] No accessibility, localization, RTL, or responsive regression remains.

## Phase 4 — Connected four-account acceptance

The forced first-login password change below is delivered by the six-move
migration in root `AUTH-COOKIE-PLAN.md`, which moves that flow into `najm-auth`.
Moves 1–2 are released as `najm-auth@3.0.0`. Move 3 (additive
`credential_setup_requirements` storage plus a bidirectional bridge to the
legacy `family_password_requirements` table, old flow still authoritative) is
implemented in migration
`packages/server/migrations/0040_credential_setup_requirements_bridge.sql`.
Moves 4–6 must not be combined with it or with each other.

Use isolated browser contexts for bootstrap admin, one newly created family,
newly approved Sponsor A, and a managed-demo seeded Sponsor B. Never save
passwords, OTPs, cookies, mailbox addresses, or other secrets in the repository
or evidence.

- [ ] Prepare the intended PostgreSQL and SMTP target, safe test identities,
  and a unique run label without printing secrets.
- [ ] Create and activate the family through the UI, including forced first-login
  password change and family-only access checks.
- [ ] Submit Sponsor A through `/apply`, verify only its matching OTP email,
  approve it, and prove normal sign-in. Sign in as Sponsor B and prove the
  idempotent seed reuse path does not duplicate or reset identities.
- [ ] Assign both sponsors to one family; exercise pending, rejection,
  validation, duplicate validation, refund, plan lifecycle, and exact funding
  target activation in integer minor units.
- [ ] Prove each sponsor sees the shared family once, only its own financial
  history, and no private household data.
- [ ] Exercise order submission/cancellation, rejection reserve release,
  purchase receipt variance, delivery Staff A failure, Staff B reassignment,
  retry, confirmation, idempotency, lifecycle history, and role projections.
- [ ] Capture desktop, tablet, phone, keyboard, validation, loading, empty,
  error, and Arabic RTL evidence for critical journeys and server-side forbidden
  actions.
- [ ] Record all created test data and remove it only through supported
  application workflows when required.

Phase 4 gate:

- [ ] The four connected accounts complete the journey without unresolved
  session, email, authorization, privacy, financial, or lifecycle failures.
- [ ] Evidence contains masked identifiers only and no secrets.

## Phase 5 — Local acceptance, release audit, and deployment

- [ ] At the exact candidate commit, run and record:

  ```bash
  bun run lint
  bun run typecheck
  bun run test
  bun run build
  bun run db:generate
  bun run test:db
  bun run --cwd apps/web test:e2e
  ```

- [ ] Investigate any migration generated by `db:generate`; do not accept
  unexplained schema drift or altered deployed migrations.
- [ ] Production-smoke `/`, `/dashboard`, `/api/system/health`, and
  `/api/mcp/tools` with the intended runtime configuration.
- [ ] Inspect every modified, deleted, and untracked file; preserve unrelated
  user changes and scan the intended release for secrets, private data, OTPs,
  cookies, dumps, certificates, and generated artifacts.
- [ ] Fetch `origin`, record local and remote SHAs, integrate upstream changes
  non-destructively, stage only the audited release, and run
  `git diff --cached --check` before committing on `main`.
- [ ] Push normally to `origin/main`, verify local `HEAD`, `origin/main`, and
  GitHub SHA match, then monitor the workflow to a terminal result.
- [ ] Report local acceptance, GitHub workflow, and deployment as separate
  pass/fail outcomes.

Phase 5 gate:

- [ ] All required gates pass at one recorded commit.
- [ ] GitHub `main` contains the audited release at the recorded SHA.
- [ ] The worktree is clean, or every intentional remaining file is documented.
- [ ] Deployment status is explicitly verified rather than inferred from a push.

## Execution order

- [ ] Phase 1 — Finish server-backed list pagination
- [ ] Phase 2 — Complete branding asset acceptance
- [ ] Phase 3 — Complete Kit dashboard chart and skeleton acceptance
- [ ] Phase 4 — Connected four-account acceptance
- [ ] Phase 5 — Local acceptance, release audit, and deployment

Do not mark a phase complete from source inspection alone. A phase closes only
when its implementation, focused tests, acceptance evidence, and recorded
commit all satisfy its gate.
