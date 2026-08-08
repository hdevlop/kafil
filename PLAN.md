# Kafil Remaining Work Plan

Status: **ACTIVE**

Last updated: 2026-08-08

This plan replaces the previous root plan. It is the sole roadmap for the
current worktree: there is no required companion pagination plan. Completed
history is deliberately omitted; the baseline below records only implementation
that is already present and still needs acceptance evidence.

## Verified baseline

- Root and web manifests, `bun.lock`, and the installed package resolve
  `najm-kit@2.7.3`. Do not use the superseded `2.1.56` baseline.
- Branding already uses Najm Kit `ImageInput`; Kafil's old
  `BrandingAssetPreview` is gone. The server owns managed branding storage,
  safe fallback projection, MIME validation, and raw-byte asset delivery.
- Local reusable dashboard chart components are gone. Admin, Family, and
  Sponsor dashboards consume Najm Kit chart exports and one shared dashboard
  skeleton composition.
- The current dirty worktree contains an in-progress move of list surfaces to
  Najm Kit pagination/query helpers. Preserve all unrelated user changes while
  completing or reviewing that migration.
- Evidence recorded on this worktree before this plan was written:
  - focused web branding/chart/pagination tests: 59 pass, 0 fail;
  - server unit suite: 397 pass, 48 PostgreSQL-gated skips, 0 fail.
- These results prove source-level behavior only. They do not replace the
  browser, PostgreSQL, production-runtime, GitHub, or deployment gates below.

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
