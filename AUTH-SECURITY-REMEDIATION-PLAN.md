# Auth security remediation plan

Date: 2026-09-05

Status: shared fixes are published and adopted by Kafil with local package,
application, database, and focused production-browser verification. Kafil Git
publication, deployment, and production acceptance have not been performed.
See the implementation log and closure record below.

## Objective and ownership

Fix the defects found in the 2026-09-05 Najm Auth and Kafil production review,
then prove the fixes in the published package, the Kafil consumer, and the
running application at `https://kafala360.ma`.

- Shared auth behavior belongs in `C:/Users/hdevlop/Desktop/najm/packages/najm-auth`.
- Atomic cache operations belong in the sibling `packages/najm-cache`.
- Kafil owns consumer configuration, dependency pins, deployment wiring,
  application-specific authorization, and acceptance evidence.
- Shared Next.js integration changes belong in `najm-auth` or `najm-next`,
  according to the existing boundary. Keep Kafil's Next config on its preset.
- Other consumers, including School, are outside this plan's migration scope.

This is a task-specific root plan, not a replacement for the completed
`CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md` or a project-wide roadmap.
The original request authorized writing the plan only. Subsequent continuation
and fix requests authorized the implementation, package publication, and local
consumer verification recorded below, but not Kafil Git publication,
deployment, or production acceptance.

## Review baseline

These are observations from the preceding review, not post-fix acceptance.
Refresh versions, advisories, and deployed configuration when execution starts.

| ID | Finding | Evidence and boundary | Owner |
| --- | --- | --- | --- |
| AUTH-01 | High: generic user deactivation leaves API access valid | Local source and installed `najm-auth@3.4.0`: inactive user resolved from an existing access token and passed `AuthGuard`. `UserService.update()` does not invalidate sessions. Kafil's custom `adminAccessService.deactivate()` already calls revocation; preserve that protection. | Najm Auth |
| AUTH-02 | Medium: saved signed session survives logout | Local reproduction: logout revoked the family and access token, but replaying the saved signed cookie still authenticated. The resolver checks a user version, not the revoked family. Default snapshot lifetime is 300 seconds. | Najm Auth |
| AUTH-03 | Medium: reset-request throttling bypass | Live `/api/auth/forgot-password`: three requests succeeded, fourth returned `429`; an extra `identifier` allowed further requests for the same email. Distinct valid extra identifiers each received a fresh bucket. Only nonexistent `example.invalid` addresses were used. | Najm Auth |
| AUTH-04 | Medium: reset token can be consumed twice concurrently | Local source and installed package: two concurrent `verifyResetToken()` calls both succeeded. Cache lookup and deletion are separate operations. | Najm Cache + Auth |
| DEP-01 | Dependency advisories require remediation | `bun audit --production`: Kafil 36 advisories (16 high, 18 moderate, 2 low); Najm workspace 24 (13 high, 10 moderate, 1 low). These are audit results, not counts of proven live exploits. Kafil installs Next.js `16.2.10` and Sharp `0.34.5`. | Both repositories |
| OPS-01 | OAuth start errors have incorrect HTTP semantics | Live GitHub start returned `500` with `oauth_provider_disabled`; invalid Google return paths also returned `500`. Callback handling rejected invalid state. GitHub enablement in the deployed runtime was not established. | Najm Auth + Kafil configuration |
| EDGE-01 | Strict CSP is still report-only | Live edge enforces framing/base/form/object restrictions, while script and other resource restrictions are report-only. No XSS exploit was demonstrated. | Kafil edge + shared Next integration if needed |

Source pointers in the Najm repository:

- `packages/najm-auth/src/users/UserService.ts`
- `packages/najm-auth/src/auth/AuthGuard.ts`
- `packages/najm-auth/src/auth/AuthResolver.ts`
- `packages/najm-auth/src/auth/AuthController.ts`
- `packages/najm-auth/src/auth/CookieManager.ts`
- `packages/najm-auth/src/auth/AuthSessionService.ts`
- `packages/najm-auth/src/tokens/TokenService.ts`
- `packages/najm-auth/src/client/sessionCookie.ts`
- `packages/najm-auth/src/oauth/OAuthService.ts`
- `packages/najm-auth/src/oauth/OAuthController.ts`
- `packages/najm-auth/src/oauth/GitHubOAuthController.ts`
- `packages/najm-cache/src/drivers/Driver.ts`, `MemoryDriver.ts`, and `RedisDriver.ts`

The auth test command passed 349 tests with 6 skips, followed by an RSC run with
13 passes and 6 skips. Passing existing tests did not cover the four defects.
The review did not verify deployed dependency versions, authenticated production
role isolation, or Redis persistence across a production restart.

Controls to preserve: unauthenticated API denials, protected-page redirects,
forged-cookie rejection, login throttling despite spoofed forwarding headers,
required Redis, PostgreSQL account lockout, healthy readiness checks, HTTPS/HSTS,
anti-framing headers, and non-exposure of `.env` and `.git` over HTTP.

## 1. Capture regressions and execution prerequisites

- [x] Record both repository SHAs, worktree state, installed versions, and exact
  public package resolutions. Do not overwrite unrelated changes.
- [x] Read each repository's `AGENTS.md` and relevant Kafil backend/frontend
  skills. Read the browser-testing skill for acceptance work and the installed
  Next.js guides before changing its integration.
- [x] Convert the four review reproductions into failing package regressions.
  Keep credentials, cookies, reset tokens, and fixture identities out of logs.
- [x] Prepare isolated PostgreSQL, real Redis, and Mailpit for integration
  tests. Verify the targets before any fixture creation; never run destructive
  seed commands against production.
- [x] Capture fresh audit reports and trace each advisory to the installed
  version, dependency owner, runtime/build/test use, and affected code path.
- [ ] Store sanitized evidence under `docs/evidence/auth-security/<run>/` in
  Kafil, with package-side artifacts linked by exact revision.

Suggested execution order: fix the live limiter mismatch first; implement the
cache primitive before reset consumption; then complete account and session
revocation. Dependency remediation can be prepared independently. All package
changes must pass their combined gate before the consumer release.

## 2. Fix identity selection for throttling (AUTH-03)

- [x] Make the forgot-password key depend only on the normalized email that its
  validated DTO and handler actually use. Do not let an ignored `identifier`
  field choose the bucket.
- [x] Preserve the exported login key's compatibility while separating the
  reset-email contract. Inspect every other caller before changing the helper.
- [x] Ensure invalid or conflicting body fields cannot select an unrelated
  identity bucket. Test unknown keys, both identity fields, malformed JSON,
  overlong values, email casing, and normalization at the DTO boundary.
- [x] Preserve trusted-proxy IP resolution and generic reset responses; do not
  reveal account existence or weaken login/account-lockout limits.
- [x] Prove that changing ignored fields cannot obtain a fresh bucket for one
  recipient and client. Use Mailpit with a fixture account to verify the number
  of reset emails, not only response status.

Acceptance: after the configured allowance, normal and extra-field variants
remain throttled for the same recipient/client; permitted different recipients
retain the intended independent behavior. XFF spoofing still cannot reset a bucket.

## 3. Consume reset and invite tokens atomically (AUTH-04)

- [x] Add a documented compare-and-delete operation to Najm Cache. The exact
  exported name is an implementation decision; it must return whether this
  caller consumed the expected value.
- [x] Implement Redis comparison and deletion in one atomic server operation,
  such as Lua. A mismatching old token must not delete a newer token's value.
- [x] Implement equivalent expiry-aware semantics in MemoryDriver without an
  asynchronous gap between comparison and deletion. Update CacheService,
  driver contracts, public exports, and package API snapshots.
- [x] Fail closed when a required cache or primitive is unavailable. Never
  emulate atomic consumption using separate `get()` and `del()` calls.
- [x] Validate JWT signature, type, expiry, and the replacement password before
  consuming the matching reset/invite identifier. Only the winner may proceed
  to the password mutation.
- [x] Define failure semantics explicitly: a consumed token stays consumed
  after a later storage failure; the user requests a new link. Do not restore
  a potentially replayable token. Do not report success on partial failure.
- [x] Prove one successful password change across concurrent real Redis clients
  and real PostgreSQL operations. Assert the final password belongs to the
  winner and old access/refresh sessions are revoked.
- [x] Cover expired, wrong-type, already-used, superseded, and mismatching
  tokens; invite links; invalid passwords; Redis outage; and post-consumption
  database failure. Unit mocks alone cannot close the concurrency gate.

## 4. Make account changes authoritative (AUTH-01)

- [x] Centralize shared invalidation for status changes, password replacement,
  deletion, role assignment/removal, and affected permission changes. Generic
  Najm controllers and direct UserService callers must obey the same contract.
- [x] Reject inactive, deleted, or credential-setup-required users in all API
  authentication paths: bearer, refresh cookie, signed session, recovery, and
  session establishment. A truthy cached user must not be sufficient.
- [x] Invalidate cached users and obsolete authorization claims when security
  state changes. Preserve active users and harmless profile updates.
- [x] Make concurrent invalidations safe. Specify version lifetime, cache-loss
  behavior, and transaction ordering so a stale cache fill, rollback, or
  concurrent token issuance cannot restore revoked access.
- [x] Prefer a shared invalidation service that avoids a UserService/TokenService
  DI cycle. If durable version state requires schema changes, generate new
  migrations and document rollout compatibility; never edit deployed migrations.
- [x] Keep Kafil's `adminAccessService`, family, sponsor, staff, and applicant
  protections until shared behavior is proven. Consolidate duplicate calls only
  when doing so preserves domain transactions, audit records, and privacy.
- [x] Test generic `/users` mutations as well as Kafil's application commands.
  Prove immediate denial for all old credentials, role/permission removal,
  deletion, concurrent mutation, and reactivation without resurrecting sessions.

Acceptance: once a security mutation succeeds, previous credentials cannot
authorize a protected read or write. Test the actual API response and persisted
effect; a hidden button or a changed frontend session does not prove revocation.

## 5. Bind signed sessions to revocable families (AUTH-02)

- [x] Carry the session family through every signed-cookie issuer: password and
  OAuth login, refresh, `/me`, and session recovery. Update claim types, strict
  parsing, server/Edge readers, and serialization together.
- [x] Require authoritative family validity and user security state for backend
  authorization. A signed snapshot alone is not sufficient. Define how missing
  revocation/cache state is distinguished from a valid active family; cache loss
  must not make a deleted family valid again.
- [x] Keep logout scoped to its current family. A second legitimate device must
  continue working; password reset and explicit revoke-all must end all families.
- [x] Keep API authorization authoritative even if the navigation proxy remains
  optimistic. Ensure sensitive server-side data paths use authoritative checks.
- [x] Fail closed for legacy cookies without a family. Recover them only through
  an authoritative valid refresh session, otherwise require login. Document this
  compatibility behavior and any one-time session disruption.
- [x] Test saved-cookie replay after real logout, with and without the old refresh
  cookie and bearer token. Assert protected API reads and writes are denied.
- [x] Cover logout/refresh/recovery response races, another device staying signed
  in, expired snapshots, revoked families, invalid signatures, and legacy cookies.
  Preserve the existing client logout-race and real Next.js 16 tests.

## 6. Remediate dependency advisories (DEP-01)

- [x] Refresh authoritative advisories before selecting exact target versions.
  The reviewed Next.js issue is patched in the `16.2.11` line; the Sharp advisory
  recommends `0.35.3`. Check for newer applicable fixes at implementation time.
- [x] Upgrade Kafil's Next.js and matching ESLint integration together. Upgrade
  direct Sharp consumers and verify the native library in the Linux image used
  by production, not just the Windows development install.
- [x] Triage all reported dependency paths, including Hono, Nodemailer, PostCSS,
  fast-uri, qs, nanoid, Faker, and esbuild. Patch shared owners in Najm and release
  them where required; avoid unexplained overrides or blanket major upgrades.
- [x] Update affected workspace declarations, root overrides, and Bun lockfiles
  consistently. Check duplicate/transitive copies and built runtime artifacts.
- [x] Re-run audits in both repositories. Every remaining advisory needs an
  explicit affected-path assessment and disposition. An affected high-severity
  runtime path cannot be accepted merely because existing tests pass.
- [ ] Verify image uploads, native Sharp loading, mail generation, auth/session
  flows, PWA behavior, and production builds after dependency updates.

Authoritative references used in the review:

- https://github.com/vercel/next.js/security/advisories/GHSA-6gpp-xcg3-4w24
- https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj

## 7. Correct OAuth errors and finish the CSP rollout (OPS-01, EDGE-01)

- [x] Translate expected OAuth start errors into intentional HTTP responses:
  invalid return paths are `400`; a disabled provider is `404`. Preserve the
  callback's safe redirect contract and redact provider secrets/state/code.
- [ ] Verify whether GitHub is intended to be enabled in production. Inspect only
  configuration presence and public callback configuration, never secret values.
  When disabled, present the provider as unavailable; when enabled, prove a
  successful round trip using an authorized test identity. Do not enable signup
  or bypass Kafil's profile/approval requirements to make OAuth work.
- [x] Preserve Google PKCE, state validation, verified-email handling, safe return
  paths, and Kafil's `allowSignup: false` behavior.
- [x] Inventory actual script, style, image, font, connection, and PWA requirements
  across authenticated routes and all four locales. Give the report-only CSP an
  observable, sanitized diagnostics path before using its evidence for rollout.
- [x] Implement and validate a compatible enforced policy. For inline scripts,
  choose nonce/hash integration based on the installed Next.js guide and shared
  package contracts. Record effects on caching and dynamic rendering. Do not
  claim script protection while broadly allowing arbitrary inline execution.
- [x] Keep the persisted Dokploy/Traefik and Caddy edge sources from overwriting
  the application-generated nonce policy while preserving their other security
  headers. Do not patch generated Compose alone.
- [ ] Verify login, OAuth, dashboards, theme assets, uploads, PWA registration,
  hydration, and Arabic RTL before enforcing the stricter policy.

This edge work may deploy separately from urgent auth fixes, but remains open
in this plan until its own enforcement and browser evidence are recorded.

## 8. Package and consumer verification

- [x] Run focused red/green tests first, then affected package suites and builds
  sequentially. Run real Redis/PostgreSQL tests for consumption and revocation.
- [x] From the Najm root, run `bun run --cwd packages/najm-auth test`,
  `bun run test:auth:next16`, and `bun run api:check`. Run affected cache/rate
  package tests and the repository's required aggregate gates. Do not invent
  root lint/typecheck commands absent from Najm's current manifest.
- [x] Audit the diff and public API compatibility; document expected legacy-cookie
  behavior, cache API changes, and migrations before version preparation.
- [x] Prepare and validate package tarballs using the repository release scripts.
  Test the packed exports and actual consumer resolution in an isolated checkout.
  Source tests alone are insufficient.
- [x] Publish authorized packages in dependency order: cache before auth, with
  any additional affected packages ordered by the verified dependency graph.
  Record exact versions, integrity, package checks, and publication evidence.
- [x] Update all Kafil Najm declarations, overrides, and `bun.lock` to the verified
  release. Confirm installed exports and repeat the four regression probes against
  the installed artifact.
- [x] Close the Kafil implementation slice with `bun run lint`,
  `bun run typecheck`, `bun run test`, `bun run build`, and `bun run db:generate`.
  Run `bun run test:db` for database/concurrency-sensitive behavior. Investigate
  unexpected schema output instead of accepting drift.
- [ ] Run focused local browser units with real APIs and fixture identities, then
  the affected complete spec and a production-build run. Preserve Mailpit isolation,
  exact negative-response assertions, and passive diagnostics. The production
  login/CSP smoke, form-fill, and connected-account journeys are green; the
  separate complete auth lifecycle coverage remains outstanding.
- [x] Run the complete connected four-account spec for the shared-auth consumer
  regression gate. Inspect current runner controls before choosing a production
  mode; do not invent flags or treat a previously completed plan as new evidence.
  The owned production-mode run passed all nine local tests against PostgreSQL,
  authenticated loopback Redis, and isolated Mailpit, with passive diagnostics
  clean.

## 9. Deployment, production acceptance, and recovery

- [ ] Before rollout, record the current image digest/revision, intended new
  revision, dependency versions, persisted deployment source, and any migration
  compatibility requirements. Prepare the restoration procedure and identify
  any security regression it would reintroduce.
- [ ] Deploy through the actual production owner. Record Git publication, image
  publication, deployment trigger, and running-container verification separately.
- [ ] Verify the intended image is healthy, PostgreSQL/cache readiness is good,
  Redis is required and internal, and trusted proxy hops match the real ingress.
  Report secret presence/validation only; never copy `.env` values into evidence.
- [ ] Repeat bounded public HTTP checks for protected routes, forged cookies,
  HTTPS/security headers, OAuth errors, and both normal and spoofed-XFF throttling.
- [ ] Repeat AUTH-03 with one synthetic non-deliverable recipient: unknown identity
  fields must not restore its allowance. Do not send test mail to real users.
- [ ] Prove Redis counters survive an application restart using the reviewed
  deployment window. Exercise cache failure and concurrency stress in isolation;
  do not disrupt production Redis to manufacture evidence.
- [ ] Use designated disposable accounts for production logout replay and role
  isolation. Confirm exact identities and the mailbox destination before any
  password reset, deactivation, or permission mutation. Keep race/stress tests
  in isolated infrastructure.
- [x] Inspect the current guarded auth lifecycle runner and its prerequisites
  before choosing remote test titles. Read the browser skill's remote reference;
  use zero retries, passive diagnostics, and the applicable one-attempt contract.
  Existing completed acceptance is not proof of this release.
- [ ] Confirm the mail transport's declared postcondition, fixture cleanup, intact
  unrelated accounts, no unexpected HTTP errors, and stable service readiness.
- [ ] If rollout fails, classify app/package/edge ownership. Restore only the
  affected compatible component; do not blindly roll back the app for an edge
  header failure. Document any reverted security fix and keep its finding open.
  Never reverse a data migration without a verified compatible recovery path.

## Implementation log - 2026-09-05

Source changes are complete and verified, the affected Najm packages are
published, and Kafil has adopted the exact releases locally. Kafil has not been
committed or pushed, and no deployment has been performed.

Baseline: Kafil `27364e0`, Najm `0ff3e09` (both worktrees dirty; the Kafil
`AppProviders`/`i18n.test.ts` and Najm `najm-kit`/`najm-i18n` edits present
during this work belong to a parallel i18n refactor and are untouched here).

### AUTH-03 - reset-request throttling

`authIdentityRateLimitKey` read `identifier ?? email` for every route. The reset
DTO discards `identifier`, so appending one bought a fresh bucket while every
request still targeted the same recipient. `registerDto` had the same gap.

Routes now declare which fields their own DTO accepts: `authEmailRateLimitKey`
(`email` only) backs `/auth/forgot-password` and `/auth/register`, while
`authIdentityRateLimitKey` keeps `identifier`-then-`email` for `/auth/login`,
matching the union branch zod selects and the field the service reads. A field
present but not a usable string is skipped rather than allowed to select a
bucket of its own.

Regression: `packages/najm-auth/test/reset-request-throttling.test.ts` (12).
Red before the fix: `an extra identifier cannot buy a fresh bucket for the same
recipient`, `distinct extra identifiers do not each receive their own bucket`.

### AUTH-04 - one-time token consumption

`verifyResetToken` compared with `get()` and then deleted with `del()`, so
concurrent callers both passed.

- `najm-cache` gained `compareAndDelete(key, expected)` on the driver contract,
  in `MemoryDriver` (no `await` between compare and delete) and in
  `RedisDriver` (GET and DEL inside one Lua evaluation).
  `CacheService.compareAndDelete` rejects when a driver lacks the primitive
  rather than emulating it with the pair this replaces.
- `verifyResetToken` consumes through it. `AuthService.resetPassword` now
  validates the replacement password *before* consuming, so a weak password no
  longer burns a link the user could still have used. A token consumed by a
  request that then fails storage stays consumed - deliberately, since
  restoring it would make it replayable.

Regressions: `packages/najm-cache/test/compare-and-delete.test.ts` (6) and
`packages/najm-auth/test/reset-token-consumption.test.ts` (10, against the real
cache service and a real SQL database). Red before the fix: both concurrency
cases, the invite path, and the fail-closed case.

### AUTH-01 - account changes are authoritative

A new `SessionInvalidationService` owns every "this credential is no longer
good" key: session version, family liveness and revocation, and the cached user
record. It depends on the repository rather than `TokenService` so
`TokenService` can delegate to it without closing a DI cycle; `UserService` and
`PermissionService` take it as an optional dependency.

- `UserService.update` invalidates when the payload touches password, status,
  role, email, verification, or phone - and deliberately does not for a name or
  avatar change. `delete`, `deleteAll`, `assignRole` and `removeRole` always do.
- `PermissionService` ends the sessions of a role's holders when that role's
  permission set changes, via a new `UserRepository.getIdsByRole`.
- The version bump is now an atomic `incr`, and token issuance extends the
  marker's TTL instead of rewriting its value - so a token being minted while an
  invalidation lands can no longer put the revoked version back.
- `TokenService.getUser` and `getUserFromCookie` reject a non-active account,
  and `AuthGuard` no longer treats a merely truthy principal as authorized.

Regression: `packages/najm-auth/test/account-invalidation.test.ts` (15). Red
before the fix: deactivation, deletion, role assign/remove, password
replacement, and reactivation-does-not-resurrect.

### AUTH-02 - signed sessions bound to a revocable family

The snapshot carried only a per-user session version, which a single-device
logout deliberately does not bump - so a saved cookie kept authenticating.

`SessionCookieClaims` now carries `tokenFamily`, supplied by every issuer
(password and OAuth login, refresh, `/me`, and session recovery).
`AuthResolver` authorizes the fast path against a *positive* liveness marker
keyed to the owning user, not against the absence of a revocation marker. Two
consequences, both intended:

- Losing the cache cannot make a logged-out family valid again. An unproven
  family declines the fast path and the request falls through to the
  database-backed resolver, so a live session loses only its fast path.
- Cookies written before this release lack the claim, fail strict parsing, and
  recover only through a valid refresh session. That is a one-time sign-out for
  browsers holding a snapshot but no refresh cookie at upgrade.

Review of 2026-09-05 found the first version of this incomplete in two ways;
both are fixed below under "Review follow-up". AUTH-02 stays open until the
real-Redis concurrency acceptance runs.

Regression: `packages/najm-auth/test/session-cookie-replay.test.ts` (14). Red
before the fix: replay after logout with and without the old refresh cookie,
second-device isolation, cache loss, legacy cookie, and borrowed family.

### OPS-01 - OAuth start error semantics

`OAuthFlowError` carried the right status but is a plain `Error`, so
`Err.handle` classified it as 500. The start paths now translate it: a disabled
provider is 404, an invalid return path 400, an inactive account linking 403.
The callback's redirect contract is unchanged, only the stable `oauth_*` code
crosses the boundary, and a non-`OAuthFlowError` failure is not relabelled as a
client error.

Regression: `packages/najm-auth/test/oauth-start-semantics.test.ts` (10),
asserted through `Err.handle`. Asserting on the error object's own `status`
field cannot detect this defect - that field was always correct - so the test
goes through the mapping that actually produces the response. Red before the
fix: all five status cases.

GitHub enablement in the deployed runtime is **not** established. Kafil's
`oauthConfig()` already presents a provider as absent unless both environment
variables are set, and `allowSignup: false` is preserved for both providers.

### DEP-01 - dependency advisories

`bun audit --production`: Kafil 36 -> **0**, Najm 24 -> **0**.

Kafil direct declarations: `next` 16.2.10 -> 16.2.12, `eslint-config-next` ->
16.2.12, `sharp` 0.34.5 -> 0.35.3 in both workspaces, `@faker-js/faker` 10.1.0
-> 10.6.0, and `nodemailer` 9.1.1 pinned in `packages/server`.

Kafil overrides added: `esbuild` 0.25.12, `fast-uri` 3.1.7, `hono` 4.12.34,
`postcss` 8.5.28, `qs` 6.16.0, `sharp` 0.35.3, `nodemailer` 9.1.1, and a scoped
`najm-email/nodemailer` 9.1.1.

That scoped override exists because the **published** `najm-email@2.0.2`
declares peer `nodemailer ^6.9.0` while its workspace source declares `^9.0.3`
- the registry copy is stale, and Bun satisfied the nested peer with 6.10.1.
Verified after the change: `node_modules/najm-email` resolves nodemailer 9.1.1.
The durable fix is republishing `najm-email`; the override is the deterministic
pin until then.

Najm overrides raised, several of which were themselves inside a vulnerable
range: `fast-uri` 3.1.4 -> 3.1.7, `qs` 6.15.3 -> 6.16.0, `postcss` 8.5.22 ->
8.5.28, `ip-address` 10.2.0 -> 10.7.0, `js-yaml` 3.15.0 -> 3.15.2,
`brace-expansion` 5.0.8 -> 5.0.9, plus new `hono` 4.12.34, `browserslist`
4.28.9 and `fastify` 5.12.3. `najm-auth`'s own `nanoid` floor of `^5.1.6`
allowed a version inside the vulnerable `>=4.0.0 <5.1.16` range and is now
`^5.1.16`.

Runtime checks after the upgrade: the Kafil production build succeeds (Sharp
loads, route table unchanged) and the Next.js 16 real-server proxy suite passes.
**Not yet verified**: Sharp's native library inside the production Linux image,
which needs the Docker build in the deployment step below.

### EDGE-01 - CSP

Inventory: `next/font/google` is self-hosted into `/_next/static` at build time,
the PWA manifest and service worker are same-origin, and there are no
third-party scripts, frames, or analytics. Kafil renders no remote avatar, and
`allowSignup: false` means OAuth never stores one, so `img-src 'self'` is safe.

Both persisted sources - `deploy/Caddyfile` and the Traefik dynamic middleware -
now **enforce** `default-src`, `connect-src`, `font-src`, `frame-src`,
`img-src`, `manifest-src`, `media-src`, `worker-src`, `style-src` and
`upgrade-insecure-requests`, alongside the framing, base, form and object rules
that were already enforced.

`script-src` still carries `'unsafe-inline'` and is documented as **not**
protecting against injected inline script; it only bars foreign script origins.
Removing it requires per-request nonces, which Next.js 16 applies only to
dynamically rendered pages.

**Correction (2026-09-05 review).** An earlier revision of this section claimed
that adopting nonces would impose an application-wide caching penalty, and that
the report-only policy would measure that cost. Both statements were wrong.

- Violation reports measure *policy violations* - which resources the strict
  policy would block. They say nothing about rendering or caching cost.
- Kafil's rendering was asserted rather than checked. The root layout reads
  `cookies()` and the session, so the production build already renders **28 of
  29 routes dynamically**; `/manifest.webmanifest` is the only static artifact
  and PPR is not in use. The dynamic-rendering requirement therefore costs this
  application essentially nothing.

Nonce adoption is consequently a proxy change plus browser verification, not a
performance trade-off, and it is the recommended next step for EDGE-01 rather
than a deferred one. The report-only policy's actual job is to enumerate what
the strict `script-src` would block before it is enforced; violations go to a
new sanitized sink at `/api/csp-report` which strips query strings, caps field
lengths, bounds the body *as it reads it*, and answers 204 to everything.

Tests: `apps/web/test/csp-policy.test.ts` (12) pins the two edge sources
byte-identical to each other and proves the sink never logs a reported URL's
query string.

**EDGE-01 remains open**: enforcement is written but not deployed, and the
browser evidence the plan requires - login, OAuth, dashboards, theme assets,
uploads, PWA registration, hydration, Arabic RTL - needs the running site.

### Review follow-up - 2026-09-05

Code review found three reproducible defects in the work above. All three are
fixed, each with a regression test confirmed red against the prior code.

**1. High - refresh could undo logout (`SessionInvalidationService`).** A
refresh that rotated its database row, was descheduled, and resumed after a
logout re-marked its family live. The row was gone and the revocation marker
was set, but nothing on the fast path read either, so the saved session cookie
authenticated again. Issuance and revocation now have coordinated semantics in
which revocation always wins: `markFamilyIssued` writes, re-reads the
revocation marker, and withdraws its own write if one appeared, while
`markFamilyRevoked` sets the revocation marker *before* clearing liveness.
Every interleaving of the pair converges on revoked. A new `familyStatus()`
returns `live` / `revoked` / `unknown` from one batched read, so `revoked` is
authoritative for readers even if a liveness marker somehow exists.

**2. High - cache loss revived revoked bearer tokens (`TokenService`).** The
positive liveness check guarded signed-cookie resolution only. Bearer
verification still rested entirely on absences - no blacklist entry, no
revocation marker, and a session version defaulting to zero - so an empty cache
made a revoked token verify again while its family was absent from the
database. `verifyAccessToken` now additionally requires the family's liveness
marker to be present *and* to name the token's own user, in the same single
batched read (four keys, still one round trip). Cache loss now fails closed:
the bearer token is refused and the client re-establishes through the
database-backed refresh session. A token carrying no family cannot satisfy this
and is refused by design; `generateAccessToken`'s contract documents that.

**3. Medium - the CSP report cap did not bound the read (`cspReports.ts`).**
`request.arrayBuffer()` buffered the whole body before the size was examined,
so a sender omitting `Content-Length` could make the endpoint hold far more
than the 8 KiB limit - 256 KiB in the reviewer's test. The body is now consumed
chunk by chunk and the reader cancelled the moment the running total exceeds
the cap. `Content-Length` remains a short-circuit optimisation, never the
enforcement.

Regressions: `packages/najm-auth/test/revocation-wins.test.ts` (10) and two new
cases in `apps/web/test/csp-policy.test.ts`. Red before the fixes: seven of the
ten auth cases, and the streaming-body case.

Two existing fixtures were updated rather than the contract weakened: both
modelled a cache that vouches for nothing, which the stricter bearer path now
correctly refuses.

**Operational consequence of fix 2, to confirm before rollout.** Making the
bearer path depend on a positive marker means that if the auth keyspace is ever
lost while the application is running, every bearer token is refused at once and
every client re-establishes through `/auth/refresh` simultaneously. The
production compose service runs `redis-server --appendonly yes` with no
`maxmemory`, so the default `noeviction` policy applies and the markers survive
a restart from AOF - the herd is reachable only by a deliberate flush, an AOF
loss, or a volume wipe. Verify that configuration has not drifted before
deploying, and do not introduce a `maxmemory` cap without an eviction policy
that spares `auth:*`.

**Later closure note.** This was the gap at the review checkpoint below. The
subsequent local networked acceptance in
[Local real-infrastructure acceptance - 2026-09-05](#local-real-infrastructure-acceptance---2026-09-05)
replaced the scripted-only evidence with PostgreSQL 18 plus a Redis
7-compatible server. Production Linux Redis OSS remains a rollout acceptance
item.

### Verification run

| Command | Result |
| --- | --- |
| `bun run --cwd packages/najm-cache test` | 46 pass, 0 fail |
| `bun run --cwd packages/najm-auth test` | 422 pass, 6 skip, 0 fail |
| `bun run --cwd packages/najm-auth test:rsc` | 13 pass, 6 skip, 0 fail |
| `bun run test:auth:next16` (Najm root) | PASS, real Next.js 16 production server |
| `bun run api:check` (Najm root) | snapshot current |
| `bun run test:rate` (Najm root) | 79 pass, 0 fail |
| `bun run test:seq` (Najm aggregate) | 23/23 packages passed |
| `bun audit --production` (Najm) | No vulnerabilities found |
| Kafil `bun run lint` | clean |
| Kafil `bun run typecheck` | clean |
| Kafil `bun run test` | 356 web + 347 server + 85 seed pass, 0 fail; 53 opt-in server skips |
| Kafil `bun run build` | success |
| Kafil `bun run db:generate` | No schema changes, nothing to migrate |
| `bun audit --production` (Kafil) | No vulnerabilities found |

Every row was re-run after the review follow-up fixes and reflects that second
run.

At this checkpoint, `bun run test:db` and the Playwright suites had not run.
The later evidence below records the completed local DB gate and focused
production-build browser journeys against the subsequently published and
adopted packages. Broader route and production acceptance remain open.

### Published releases and compatibility

The clean release worktree produced and published these source-attributable
artifacts in dependency order. Registry metadata and freshly downloaded
tarballs matched the recorded shasums and integrity values.

| Package | Version | Release commit | Tarball SHA-256 | Registry shasum |
| --- | --- | --- | --- | --- |
| `najm-cache` | `2.2.0` | `b68a3df` | `0ef59046649542b772122b532b2e41d33dcf97caa56fb55adb9f0797f7d9e2c5` | `14146b78402d148066ffa69beee24ede62155312` |
| `najm-email` | `2.0.3` | `8f7c6d6` | `d4d3de8abb8ed4de9808453984b800f2228b24f048ad14993f2ef870377d230e` | `203f21b81ebe658bd0920edba5e7823d1abebaa1` |
| `najm-auth` | `4.0.0` | `a0d3115` | `21852f550fc2b78058b93cd6dc46690b458a9756e7fadd3abbecde3178298008` | `f8677c17298deb7ad728432c837ed2443e90b92a` |
| `najm-mcp` | `2.1.2` | `88d57ab` | `32ed4a5fc86bda30a68b638a399d18436bfe560f065fb65ab82da6915982fb8d` | `42974f7413d278a97b6deb706c8ebb14d0f78e48` |

`najm-mcp@2.1.2` is a metadata compatibility release discovered during Kafil
installation: its optional auth peer now accepts `^3.2.1 || ^4.0.0`. Its 41
tests, build, API snapshot, packed manifest, and registry artifact were checked
before the final Kafil install.

`najm-auth` API compatibility: `SessionCookieClaims.tokenFamily` and
`SessionCookieData.tokenFamily` are new **required** fields. Kafil constructs
neither, verified by search, so this consumer is unaffected; a consumer that
builds claims by hand would need to supply the field. The runtime migration is
the one-time legacy-cookie sign-out described under AUTH-02. Because required
public fields and rejection of family-less bearer tokens are breaking
contracts, this candidate requires a major release rather than the previously
proposed 3.5.0 minor.

## Closure record

For each finding, record the fixing repository/SHA, published versions, Kafil
consumer SHA, exact test commands and native exit codes, sanitized assertion
evidence, and deployed digest where applicable. A skipped check remains open.

| Boundary | Required evidence | Status |
| --- | --- | --- |
| AUTH-01, AUTH-03, AUTH-04 implemented | Red/green regressions, API behavior, real concurrency tests | **Published and locally adopted** - `najm-cache@2.2.0` and `najm-auth@4.0.0`; PostgreSQL 18 plus a Redis 7-compatible server proved one reset winner and the delayed refresh/logout race; a separate real HTTP/Redis/Mailpit run proved the ignored-field and spoofed-forwarding variants stopped at three emitted reset messages |
| AUTH-02 and cache-loss behaviour | Real Redis/PostgreSQL concurrency acceptance | **Published and locally adopted** - local PostgreSQL 18 plus a Redis 7-compatible server proved cache-loss fallback, revocation ordering, and durable revocation after physical deletion is unavailable. Production Linux Redis OSS remains a rollout acceptance item |
| Dependency remediation | Fresh audits, affected-path dispositions, native/runtime checks | **Done except the Linux image** - both audits clean; Sharp's native load inside the production image is unverified |
| OAuth behavior | Correct error statuses and enabled/disabled provider acceptance | **Statuses done** - deployed GitHub enablement still unestablished |
| CSP enforcement | Persisted edge policy and complete affected-browser evidence | **Implemented and focused-local green; broader acceptance open** - Kafil generates a fresh nonce policy per request, forwards it through the published auth proxy seam, bootstraps Zod in jitless mode, and prevents edge sources from overwriting it. The production build passed desktop/mobile/Arabic login, nonce rotation/script matching, and form-fill journeys. OAuth, authenticated dashboards, theme/upload, PWA, deployment, and production evidence remain open |
| Package publication | Reviewed tarballs, exact registry versions and integrity | **Done** - exact versions, release commits, SHA-256 values, registry shasums, integrity metadata, packed exports, and consumer resolution are recorded for cache 2.2.0, email 2.0.3, auth 4.0.0, and MCP 2.1.2 |
| Kafil integration | Exact pins, installed-artifact regressions, full root/DB/browser gates | **Locally integrated; broader browser gate open** - all declarations and overrides resolve auth 4.0.0, cache 2.2.0, email 2.0.3, and MCP 2.1.2; the full root gate, 35 database tests, production login/CSP smoke, persisted form-fill journey, and complete connected four-account journey pass. The separate complete auth lifecycle and broader CSP route suites remain open |
| Production deployment | Intended running image and validated configuration | **Not started** - awaiting authorization |
| Production acceptance | Bounded live probes, fixture checks, persistence, cleanup | **Not started** - awaiting authorization |

Only mark the plan complete when every required boundary has evidence. This
document's creation and whitespace validation close the planning request only.

## Revoked refresh fallback correction - 2026-09-05

Implemented in Najm before the package release after the follow-up review:

- `TokenService` checks `familyStatus` after reading the refresh row on both
  cookie resolution and refresh. A known revocation rejects with 401 and clears
  both cookies, even when the database delete failed and left a valid current
  or grace-window hash. An unknown cache state still permits database recovery.
- Initial storage refuses a known revoked family before writing. Storage and
  rotation both honor `markFamilyIssued` returning false, so a logout that wins
  during issuance produces an error rather than a successful token response.
- `SessionInvalidationService` retains revocation for the greater of the access
  and refresh lifetimes. The old access-only TTL could expire while a retained
  refresh row and cookie were still valid after a failed delete.
- Race tests now pause at explicit barriers after each cache write and after
  database storage/rotation. Reordering the inputs to `Promise.all` was not
  evidence of a different execution order and has been replaced.

The resolver regressions exercise actual `AuthResolver.activate()` fallback,
with a saved snapshot and with a rejected bearer token. They also verify cookie
clearing, no rotation or grace-slot consumption on rejection, another device
remaining signed in, and rejection beyond the access-token lifetime. Existing
tests continue to verify legitimate recovery after cache loss.

Evidence from this correction (exit codes are native command results):

| Command / boundary | Result |
| --- | --- |
| Before the source fix: `bun test packages/najm-auth/test/revocation-wins.test.ts packages/najm-auth/test/session-cookie-replay.test.ts` | Exit 1: 24 pass, 4 fail; failures reproduce successful delayed refresh, current/previous cookie replay after failed deletion, and replay beyond access expiry |
| Same focused command immediately after the source fix | Exit 0: 28 pass, 0 fail; two additional issuance regressions were subsequently added and included in the full suite below |
| `bun run --cwd packages/najm-auth test` | Exit 0: 428 pass, 6 existing skips, 0 fail; separate RSC invocation: 13 pass, 6 existing skips, 0 fail |
| `bun run build:auth` | Exit 0: JavaScript and declarations built; 10 dependency tasks successful, 9 cached |
| `bun run test:auth:next16` | Exit 0: real Next.js 16 + Bun production proxy recovery suite PASS |
| `bun run api:check` | Exit 0: public API snapshot current |
| Najm `git diff --check` | Exit 0 |

This is source verification, using real SQLite repositories and the memory
cache with controlled scheduling and injected database-delete failure. It does
not close real Redis/PostgreSQL concurrency acceptance. The earlier aggregate,
Kafil gates, and audit results above belong to the prior run and were not
re-run for this Najm-only implementation correction.

At this point in the implementation sequence, AUTH-02 and cache-loss acceptance
still had one open design gap: a failed physical database delete followed by
loss of its Redis revocation marker left a retained active row indistinguishable
from a legitimate cache-loss recovery. The durable token-row tombstone recorded
below closes that combined failure. Redis revocation-marker capacity still has
to be included in production planning.

No package version was bumped or published, no Kafil Najm pin was changed, and
no deployment was performed. Kafil's installed published auth package does not
yet contain this source correction.

## Nonce proxy composition preparation - 2026-09-05

Prepared in the unpublished Najm worktree as the next EDGE-01 prerequisite:

- `auth.proxy(request, { requestHeaders })` now merges application-owned,
  request-scoped headers into every successful Next.js pass-through. Auth still
  evaluates the original request, while downstream headers survive public
  routes, optimistic authenticated routes, and authoritative session recovery.
  Consumer attempts to override `cookie` or `authorization` fail closed so the
  render cannot observe a different principal from the one Proxy authorized.
- The API is additive and exported from both `najm-auth/client/server` and
  `najm-auth/client/edge`. The documented consumer composes `x-nonce` and the
  request CSP through Najm, then writes the identical CSP on the response.
- The real Next.js 16 production fixture creates a fresh nonce per navigation
  and proves the response policy, the value visible to the Server Component,
  and every rendered Next.js script use the same nonce. It also keeps the
  existing recovered-session navigation assertions green.

Evidence:

| Command | Result |
| --- | --- |
| Focused proxy and entrypoint regressions | 30 pass, 0 fail |
| `bun run --cwd packages/najm-auth test` | 432 pass, 12 skips, 0 fail after adding the opt-in infrastructure suite; RSC invocation 13 pass, 6 existing skips, 0 fail |
| `bun run test:auth:next16` | PASS, real Next.js 16 production render and recovery with nonce assertions |
| `bun run api:check` | Public API snapshot current |
| Najm `git diff --check` | Exit 0 |

This does not enforce CSP in Kafil yet. The installed `najm-auth@3.4.0` lacks
the new overload, so consumer wiring and browser acceptance must wait for the
authorized package release. No version was bumped, no package was published,
and no Kafil dependency pin or deployment was changed in this preparation.

## Local PostgreSQL and Redis-protocol concurrency acceptance - 2026-09-05

Added `packages/najm-auth/test/real-postgres-redis-security.test.ts`, gated by
`NAJM_AUTH_REAL_INFRA=1`. It refuses non-loopback service URLs, creates and
drops a randomly named PostgreSQL database, and confines Redis state to a
unique prefix that it removes afterward. The normal auth suite skips it, so a
missing integration service cannot turn a required acceptance run into a false
pass.

The local machine had PostgreSQL 18 on loopback but no Docker, WSL distribution,
Redis, Memurai, or Podman runtime. The acceptance run therefore used the
official `MemuraiDeveloper` 4.1.7 NuGet package as a temporary, non-service
Redis 7-compatible process on `127.0.0.1:6399`. Download SHA-256:
`96800A0154E2CE02F61BA614B749A8B81F5A924C20687870394CB3AA86E2F2A4`.

Evidence:

| Boundary | Result |
| --- | --- |
| Sixteen concurrent Redis Lua compare-and-delete calls | Exactly one winner; mismatching stale value preserved the replacement |
| Twelve concurrent reset-password calls | Exactly one success; PostgreSQL stored the winning password; token replay failed |
| Refresh paused after PostgreSQL rotation, followed by logout | Refresh returned 401; no active row remained; family remained revoked; old bearer denied |
| Redis keyspace loss with a live database refresh row | Old bearer denied; refresh recovered and issued an authorizable replacement |
| Physical delete unavailable, durable PostgreSQL revocation, then Redis keyspace loss | Row remained `revoked`; same-family issuance, refresh, and old bearer authorization were denied |
| `bun run --cwd packages/najm-auth test:real-infra` | 5 pass, 0 fail, 20 assertions |
| Cleanup | Zero acceptance-prefixed Redis keys; temporary database dropped by the passing teardown; process stopped; downloaded package directory removed |

This is a real networked PostgreSQL and Redis-protocol validation, but not a
production Linux Redis OSS run. It closes the scripted-stand-in gap locally;
production cache configuration remains an explicit rollout acceptance item.

## Durable refresh-family tombstones - 2026-09-05

The combined database-delete-plus-cache-loss gap was closed in Najm before
release without a schema change. Both shipped auth schemas already expose
the `tokens.status` enum with `active`, `revoked`, and `expired` values.

- Single-family and user-wide revocation now update active rows to `revoked`
  and clear their grace-window fields. The row remains until its original
  refresh expiry, when the existing physical cleanup removes it.
- Family lookup, rotation, and grace-slot claims require `status = active`.
  A revoked tombstone therefore cannot recover or rotate after Redis loss.
- The token-family upsert updates only an active row belonging to the same user.
  Its caller requires a returned row, so cache loss cannot let explicit
  same-family issuance revive a tombstone.
- Physical deletion is no longer part of the revocation success path. A total
  database write failure still makes the revocation request fail visibly; it
  is not reported as a durable success.

Evidence after the correction:

| Command / boundary | Result |
| --- | --- |
| Focused SQLite session/race suites | 44 pass, 0 fail, 136 assertions |
| `bun run --cwd packages/najm-auth test:real-infra` | 5 pass, 0 fail, 20 assertions against PostgreSQL 18 and the temporary Redis-compatible process |
| `bun run --cwd packages/najm-auth test` | 433 pass, 13 opt-in skips, 0 fail; RSC invocation 13 pass, 6 existing skips, 0 fail |
| `bun run build:auth` | 10/10 tasks successful |
| `bun run test:auth:next16` | PASS, real Next.js 16 production render and recovery |
| `bun run api:check` | Public API snapshot current |
| `bun run test:seq` | 23/23 Najm packages passed |
| Kafil `bun run test:db` | 35 pass, 0 fail against the local `kafil` PostgreSQL database; fixtures cleaned by the guarded suites |

The temporary Redis-compatible process was stopped, port 6399 was confirmed
free, and its validated OS-temp directory was removed. No version was bumped,
no package was published, and no consumer or deployment was changed.

## Installed Kafil browser baseline - 2026-09-05

`bun run --cwd apps/web test:e2e:form-fill` passed 1/1 in 44.5 seconds against
the actual Kafil runtime resolution (`najm-auth` 3.4.0 and `najm-cache` 2.1.2).
The guarded runner proved its database authorization and secret-presence
contracts, read `platform_settings` directly, booted an owned Next.js 16.2.12
server, and prewarmed `/apply`, `/login`, and `/api/system/health` with 200
responses. The browser then:

- authenticated the configured admin;
- enabled the persisted shortcut and proved F8 populated a fresh public
  application form;
- disabled it and proved the same fields stayed unchanged in another fresh
  context;
- observed no page errors, browser-console errors, failed requests, or 4xx/5xx
  responses; and
- restored the original setting in `finally`.

Because the root `.env` intentionally has no `REDIS_URL`, this local acceptance
used a checksum-pinned temporary MemuraiDeveloper 4.1.7 process on
`127.0.0.1:6399`. The process and owned Next server were stopped, both ports
were confirmed free, the scratch Next build was removed, and the exact
temporary package directory was moved to the Recycle Bin. This is form-fill
browser evidence only; it does not claim acceptance of the unpublished auth or
CSP changes.

The only server-side diagnostic was the expected local proxy warning that
`trustedProxyHops = 0` had no usable socket peer, so local requests shared one
rate-limit bucket. It produced no failed response and does not establish the
production trusted-hop configuration; that remains part of deployment
acceptance.

## Pre-publication package audit - 2026-09-05

The registry and local package versions still match the published baselines:
`najm-cache` 2.1.2, `najm-email` 2.0.2, and `najm-auth` 3.4.0. The release script
correctly refuses every build, test, pack, or publish path while the worktree is
dirty, so no source-commit-attributable tarball can exist before the candidate
changes and version bumps are reviewed and committed.

The release review found and corrected the following documentation, versioning,
and packaging defects:

- `najm-auth` still described password-reset tokens as JWT-expiry-only and
  recommended a non-atomic consumption pattern. Its README now documents the
  implemented cache-backed atomic compare-and-delete contract and fail-closed
  custom-driver behavior. The Unreleased changelog now covers AUTH-01 through
  AUTH-04, OAuth semantics, durable tombstones, nonce proxy composition, and
  the breaking migration.
- `najm-cache` documented a nonexistent `delete()` method and omitted the new
  primitive. Its README now uses `del()`, documents `compareAndDelete()`, and
  its changelog records the Redis Lua, memory-driver, and custom-driver
  semantics.
- `najm-auth/NAJM_AUTH.md` and the `CookieManager` contract comment still
  described cookie signature validation and cache absence as sufficient session
  authorization. They now document the required family/version checks, durable
  database tombstones, fail-closed cache loss, and the distinction between
  access-only and full-family invalidation.
- The cache manifest advertised `./* -> ./src/*.ts`, although `files: ["dist"]`
  never published those targets. Neither Najm nor Kafil source imports a cache
  subpath, so the false wildcard was removed and a package-surface regression
  now requires every declared target to live under the published `dist`
  directory.

The planned auth version is now 4.0.0, not 3.5.0. Requiring
`SessionCookieClaims.tokenFamily` / `SessionCookieData.tokenFamily` and refusing
family-less bearer tokens are public compile-time and runtime breaking changes;
calling them a minor release would misstate the consumer migration.

Package-content dry runs were deliberately non-release evidence:

| Check | Result |
| --- | --- |
| `npm.cmd pack --dry-run --json --workspace packages/najm-cache` | Listed four entries including the updated README plus compiled runtime/declarations; created no tarball |
| `npm.cmd pack --dry-run --json --workspace packages/najm-auth` | Listed 27 entries covering every declared export plus the updated README; created no tarball |
| Compiled contract inspection | Cache declarations/runtime contain `compareAndDelete`; auth root/server/edge declarations contain required family claims, `SessionInvalidationService`, and `AuthProxyOptions`; compiled runtime contains the active-row/tombstone and proxy-header checks |
| `bun run build:cache` | 2/2 dependency tasks successful |
| `bun run --cwd packages/najm-cache test` | 47 pass, 0 fail, 115 assertions, including the new manifest/package-surface regression |
| `bun run build:auth` | 10/10 dependency tasks successful |
| `bun run --cwd packages/najm-auth test` | 433 pass, 13 opt-in skips, 0 fail, followed by 13 RSC pass and 6 existing RSC skips |
| `bun test scripts/publish-package.test.ts` | 30 pass, 0 fail |
| `bun run api:check` | Public API snapshot current |

No package version changed, no release tarball was created, and nothing was
published, installed into Kafil, committed, pushed, or deployed.

## AUTH-03 loopback Mailpit acceptance - 2026-09-05

Added the opt-in Najm runner
`packages/najm-auth/integration/mailpit-forgot-password/run.ts`. It boots the
real auth plugin and `AuthController` over HTTP with an ephemeral SQLite
fixture, required loopback Redis, and loopback Mailpit. Non-loopback service
configuration fails before fixture creation. The runner generates unique
addresses in memory, retains no mailbox content, and removes only its own
Mailpit messages and Redis key prefix in `finally`.

Focused command result, native exit code 0:

```text
AUTH_MAILPIT_ACCEPTANCE PASS
HTTP primary=200,200,200,429,429 secondary=200 unknown=200 generic_body=matched
MAIL primary=3 secondary=1 unknown=0
REDIS isolated_rate_buckets=present
```

The three allowed primary requests used different ignored `identifier` fields
and different spoofed forwarding addresses. The fourth and fifth variants
still returned 429 and emitted no additional reset mail. A separate fixture
recipient retained its own allowance; an unknown recipient received the same
successful HTTP response and no message.

Mailpit 1.30.7 and the checksum-pinned MemuraiDeveloper 4.1.7 package ran only
on loopback. After the assertion, Mailpit reported zero messages, Redis
`DBSIZE` was zero, ports 1025/8025/6399 were free, and the owned temporary
processes and files were cleaned. The ordinary auth suite then remained green:
433 pass, 13 opt-in skips, 0 fail, followed by 13 React-server pass and 6
existing skips.

Sanitized evidence is recorded at
`docs/evidence/auth-security/2026-09-05-local/README.md`. Its provenance remains
the dirty local worktree rather than an immutable revision, so revision-linked
Kafil publication remained open at that checkpoint.

## Package release and Kafil adoption - 2026-09-05

The final release and adoption run used a clean Najm release worktree, then
fast-forwarded the original Najm feature branch without touching its unrelated
dirty files. Nothing was pushed. Registry verification recorded:

| Package | Registry integrity |
| --- | --- |
| `najm-cache@2.2.0` | `sha512-usj65pyVCe7RpYCCuD+s5OBQUDqp96olpeI1bOxJMQD4Jn+KG+56BYUZp/+8R8zCPg2UlXgOIiVksMGtc21rGw==` |
| `najm-email@2.0.3` | `sha512-PISsgqLWv75/enxPSt4YsZ4kk9oCC9DcyRtIoB3nGTDdWbIaCTkTzEjgY/hBDI0a//PJJiqGMEYN6+TiscIfuQ==` |
| `najm-auth@4.0.0` | `sha512-eqGKz9DOYts9W3W+oulR0gC6M5BU30pXkmqL38QSpjUouaMpVuB/axU36wP0yo2qNwD4i2EAsmh5Kq+iR6Kkeg==` |
| `najm-mcp@2.1.2` | `sha512-JNDZjcJWM9pZJ0koDIIIlxQDTXsFAW1qceER3JFZEIb7HKDHdUnB2o0ymjD/X8H8KBTykZTTIuYHzuKn8Dtv3A==` |

Kafil now pins those exact versions in every applicable workspace declaration
and root override. `bun why` resolves one active version of each package and
shows MCP's optional auth peer as compatible. Installed declarations and
runtime exports expose `AuthProxyOptions.requestHeaders`, required
`tokenFamily`, and `compareAndDelete`; the obsolete scoped Nodemailer override
is gone.

The application CSP is now request-scoped and dynamic. `proxy.ts` creates one
nonce, forwards `x-nonce` plus the identical policy through Najm Auth, and sets
that policy on the response. `layout.tsx` uses the nonce for Next scripts and a
small before-interactive bootstrap that selects Zod's documented jitless mode,
avoiding runtime code generation under strict CSP. Production edge examples no
longer overwrite this per-request header. The script policy allows only self,
the nonce, and `strict-dynamic`; `unsafe-eval` is development-only. The external
image allowance is limited to the CDN host used by the installed phone-control
flag assets.

Final exact-graph evidence:

| Command / boundary | Result |
| --- | --- |
| `bun install` plus `bun why` for all four packages | Exact versions above; compatible peer graph |
| `bun run check` | Lint and typecheck clean; 356 web, 347 server, and 85 seed tests passed; production build succeeded |
| `bun run db:generate` | No schema changes, nothing to migrate |
| `bun run test:db` | 35 pass, 0 fail against PostgreSQL with required Redis available |
| `bun audit --production` | No vulnerabilities found |
| Production `login-smoke.e2e.ts` | 4 pass: desktop, mobile, Arabic RTL, invalid credentials; nonce/script assertions included |
| Production `dev-form-fill.e2e.ts` | 1 pass; persisted setting enabled and disabled F8 and restored its original value |
| Production server diagnostics | No CSP, fallback-bootstrap, page, console, request, or HTTP error diagnostics during the valid run |

The first exact-build browser attempt was invalid because its Next process was
started with an env-file path resolved from the wrong working directory. Its
missing database and email configuration produced deterministic failures. The
process was stopped, `/login` and `/api/system/health` were prewarmed to 200
after restart with the correct root env, and both suites above then passed. The
invalid run is retained here as runner diagnosis, not acceptance evidence.

This closes package publication and focused local Kafil adoption. It does not
close the unchecked auth-lifecycle suite, the broader CSP route matrix, Kafil
Git publication, deployment, or production acceptance.

## Complete local connected-account acceptance - 2026-09-05

The local connected runner now owns its complete production prerequisites:
loopback Redis is mandatory and probed with `AUTH` plus `PING`, production mode
requires Redis authentication, the child process receives only the allowlisted
runtime environment, and a health `500` fails immediately. The web workspace
also declares Sharp's platform packages as optional dependencies so the native
runtime is present beside the Next.js application on Windows and in Linux
installs.

The first complete run found four stale local assertions. They are now aligned
with current product and authorization contracts: sponsor catalog readiness is
observed before UI assertions; contribution-plan lifecycle uses the authenticated
API because the canonical contribution page intentionally does not mount the old
workspace; persistence checks target the newly created plan rather than a removed
lifecycle table; and later units reuse the run-created Family identity. Work unit
E now signs its admin session out instead of leaking it into F, and logout proof
observes the real POST response and cookie removal without racing an extra `/me`
request against client recovery.

A final claim audit found that work unit H's title promised responsive, RTL,
keyboard, and runtime-state evidence while the implementation only checked
horizontal overflow. The unit now proves the authenticated Admin identity and
branding image, production service-worker registration, nonce-bearing
`script-src` without `'unsafe-inline'`, desktop/tablet/phone LTR overflow,
keyboard theme mutation and restoration, keyboard language switching, and
phone-width Arabic RTL overflow. Its first complete rerun also exposed a
teardown gap: Mailpit's text-search endpoint did not reliably select the exact
dynamic Sponsor A recipient. Cleanup now matches the structured recipient
address exactly and uses Mailpit's batch-delete API, followed by a zero-result
assertion.

| Command / boundary | Result |
| --- | --- |
| Focused production A-E plus diagnostics | 6 pass, 0 fail |
| Focused production A-F plus diagnostics | 7 pass, 0 fail |
| Focused production H plus diagnostics | 2 pass, 0 fail in 7.8 seconds after correcting the evidence contract |
| Complete production connected four-account spec after teardown correction | 9 pass, 0 fail in 1.1 minutes; A-H and passive diagnostics all green |
| Mailpit postcondition | 0 total messages and 0 run-owned Sponsor messages after the final complete run |
| Root verification gate | Lint, typecheck, 360 web tests, 347 server tests, 85 seed tests, production build, and `db:generate` passed; no schema drift |

This is local Windows production-build evidence against PostgreSQL, an
authenticated Redis-compatible process, and Mailpit. It does not prove Sharp in
the production Linux image, the separate complete auth-lifecycle suite, Git
publication, deployment, or production acceptance.

## Guarded auth-lifecycle runner inspection - 2026-09-05

The dedicated remote lifecycle path was inspected without invoking its
preflight or contacting production. Its normal command selects the complete
serial ten-test spec with no grep, uses one worker and zero retries, disables
automatic screenshots/traces/video, and always reports
`NO MANAGED MAILBOX TRANSPORT`. The lifecycle covers Admin logout/relogin,
Family credential setup, Sponsor email and phone login, same-context identity
switching, cross-tab logout, an in-flight protected-response overlap, stale
snapshot denial, supported cleanup, and final passive diagnostics.

The runner fails closed unless the target is exactly `https://kafala360.ma`,
remote destructive acceptance is explicitly enabled, Admin credentials are
present, retired managed-transport variables are absent, the mailbox gateway
uses its exact verified HTTPS host, and its app token meets the minimum length.
The current root environment satisfies those value-free local validation
checks, but that is not permission to run and does not prove the deployed
revision, application SMTP cutover, mailbox readiness, or designated-account
approval.

The browser-testing guidance now distinguishes the connected runner's
`KAFIL_E2E_REMOTE_GREP` from the auth runner's
`KAFIL_E2E_REMOTE_AUTH_GREP`. The normal auth acceptance remains full-suite:
a focused range can depend on earlier serial identities and can omit the cleanup
test. Focused selection is reserved for a separately authorized diagnostic
attempt after a failed one-shot run.

Focused source evidence: the four auth-lifecycle runner, diagnostics, cleanup,
and response-envelope test files pass 9 tests with 70 assertions. No remote
preflight, browser request, fixture mutation, deployment, push, or production
acceptance was performed. The auth-lifecycle execution checkbox in section 8
and all remaining deployment/production items stay open.
