# Section 07 - Reports, Operations, and Release

Status: active

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
      order pipeline, and low-stock attention list.
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
      four fixture counts.
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

## Reports

Operator reports:

- active/inactive family and sponsor counts
- active support assignments
- pending/validated/rejected contributions
- credited, reserved, spent, refunded, and available budget totals
- monthly budget activity by family
- order counts and value by status
- inventory low-stock and movement report
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
- inventory reconciliation
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
supports the three end-to-end role stories, financial/inventory reconciliation
is clean, and restore/rollback procedures have been proven.
