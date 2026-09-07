# Notification system plan (v2 - durable inbox, email, and web push)

Status: **Phases A-B implemented - durable event consumption and inbox backend
and in-app frontend complete and covered by source + PostgreSQL integration
tests; Phase C implementation complete (dispatcher-owned email with the legacy
direct sender removed) and covered by source + PostgreSQL integration tests;
lint/typecheck/test/build/db:generate and test:db green with no schema drift;
Phase D complete with the typed shared push worker published as
`najm-next@0.3.0`, registry artifact verified, and exactly pinned in Kafil;
Phase E deployment wiring is implemented and source-verified, including
dedicated worker egress, load-independent heartbeat, first-rollout rollback,
exact image identity, and migration-journal checks; the dedicated connected
spec/runner and exact nine-test discovery are green locally, but production
rollout, connected real-service execution (including Mailpit decision
delivery), and real-device push delivery remain pending, so external delivery
is NOT yet accepted. The connected acceptance journey is owned by section 12 of
`CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md`; local verification here uses
source, PostgreSQL integration, build, and schema gates.**

This is a task-specific root plan. It does not replace another plan and claims
no project-wide completion. There is no root `PLAN.md`.

## 1. Confirmed product decisions

```text
channels  = in-app + email + web push
freshness = 30-second unread-count polling; no WebSocket or SSE in v1
triggers  = every supported durable outbox topic creates an in-app row
retention = read/unread only; no user delete, unread reversal, mute, or digest
audience  = each user sees only their own inbox, including admin
```

The anti-spam rule is:

- in-app for every supported topic and recipient;
- email and push only for the high-value matrix in section 5;
- families never receive notification email in v1;
- operators and admins are not broadcast recipients in v1;
- SMS, WhatsApp, per-topic preferences, broadcasts, digests, notification
  deletion, and realtime sockets are out of scope.

## 2. Verified current state and constraints

- There is no notification feature, inbox table, bell, push subscription, or
  notification worker today.
- Domain mutations already append sanitized `outbox_events`. Known topics are
  contribution, order, funding-activation, and applicant-decision events.
- `outbox_events` already has `pending`, `processing`, `sent`, and `failed`
  states, but its repository has no claim/drain loop. Most events therefore
  remain pending.
- Applicant approval/rejection is exceptional: it enqueues an event after the
  decision operation, sends email directly, then marks that event delivered or
  failed. This path must be replaced, not duplicated.
- `OutboxService.sanitizePayload()` already removes values whose keys indicate
  passwords, tokens, secrets, authorization, addresses, CIN, documents,
  housing, registration, priority, notes, phone, email, birth, or guardian
  data. The sanitizer must become a shared exported contract rather than be
  copied.
- Auth user identifiers are text, not UUID. Notification foreign keys to the
  Najm `users` table must therefore use the installed table's text ID type.
- The application is one Next.js runtime. A separate background worker may use
  the same image and modules, but it must not introduce a second API server.
- Production email uses Resend. Local and connected acceptance use the isolated
  Mailpit gateway. Provider configuration alone is not delivery evidence.
- Before Phase D, installed `najm-next@0.2.0` supported the offline shell only.
  Phase D published and exactly pinned `0.3.0`, which now owns the typed push
  event and same-origin notification-click contract.
- `PageHeaderGlobalActions` is manually included by pages; it is not a
  guaranteed global shell slot. The notification indicator must be owned by
  `DashboardShell`, not by optional page composition.
- UI language is stored as a browser preference. There is no confirmed durable
  user notification-language field, so external-channel locale needs an
  explicit persistence contract.

## 3. Architecture

### 3.1 Transaction and delivery flow

Domain services remain responsible only for their domain mutation, audit, and
durable outbox event. They do not insert notification rows or send channels.

```text
domain transaction
  domain mutation + audit + outbox event + notification consumer job
                                |
                                v
notification worker claims consumer job
  resolve recipients at event time
  create one inbox row per recipient, idempotently
  create email/push delivery jobs from the channel matrix
  mark consumer job complete
                                |
                                v
same worker claims channel jobs
  email through Najm Email / push through Web Push
  sent, skipped, retry, or dead-letter state per target
```

The outbox enqueue and its `notifications-v1` consumer job are inserted in the
same database transaction. Old outbox rows receive no consumer job, so inboxes
start at activation without an accidental historical backfill.

The worker is a long-lived, non-HTTP process in `compose.production.yml`, using
the same immutable application image:

```text
service = notifications-worker
command = bun run notifications:worker
```

It claims bounded batches with `FOR UPDATE SKIP LOCKED`, sleeps briefly when no
work exists, handles `SIGTERM`, and is safe with more than one worker. It writes
a Redis heartbeat with a short TTL; the worker healthcheck verifies only
presence, never secrets or payload values. Application readiness stays
independent so a delivery outage does not remove the web app from service.

Provide `notifications:dispatch --once` for CI, migrations, and controlled
operations. It uses the same claim/dispatch code as the long-running worker.

### 3.2 Persistence

Add these tables through one new generated migration. Never edit a deployed
migration.

Also add nullable `actor_user_id text -> users.id ON DELETE SET NULL` to
`outbox_events`, and extend `OutboxService.enqueue()` so domain call sites pass
the authenticated actor (system jobs pass NULL). Historical rows remain NULL.

```text
outbox_consumer_jobs
  id                    uuid PK defaultRandom()
  outbox_event_id       uuid NOT NULL -> outbox_events.id ON DELETE CASCADE
  consumer_key          varchar(80) NOT NULL       # notifications-v1
  status                varchar(20) NOT NULL CHECK pending|processing|sent|failed|dead
  attempts              integer NOT NULL default 0 CHECK attempts >= 0
  available_at          timestamptz NOT NULL default now()
  leased_at             timestamptz NULL
  processed_at          timestamptz NULL
  last_error_code       varchar(120) NULL           # sanitized code, no raw error
  ...timestamps()
  UNIQUE(outbox_event_id, consumer_key)
  INDEX(status, available_at)

notifications
  id                    uuid PK defaultRandom()
  source_event_id       uuid NOT NULL -> outbox_events.id ON DELETE CASCADE
  recipient_user_id     text NOT NULL -> users.id ON DELETE CASCADE
  actor_user_id         text NULL -> users.id ON DELETE SET NULL
  topic                 varchar(120) NOT NULL
  aggregate_type        varchar(80) NOT NULL
  aggregate_id          text NOT NULL
  locale                varchar(2) NOT NULL CHECK en|fr|ar|es
  payload               jsonb NOT NULL              # sanitized scalar allowlist
  read_at               timestamptz NULL
  ...timestamps()
  UNIQUE(source_event_id, recipient_user_id)
  INDEX(recipient_user_id, read_at, created_at DESC, id DESC)
  INDEX(aggregate_type, aggregate_id)

notification_deliveries
  id                    uuid PK defaultRandom()
  notification_id       uuid NOT NULL -> notifications.id ON DELETE CASCADE
  channel               varchar(20) NOT NULL CHECK email|push
  target_key            varchar(160) NOT NULL       # user or subscription ID, no address
  push_subscription_id  uuid NULL -> push_subscriptions.id ON DELETE SET NULL
  status                varchar(20) NOT NULL CHECK pending|processing|sent|failed|skipped|dead
  attempts              integer NOT NULL default 0 CHECK attempts >= 0
  available_at          timestamptz NOT NULL default now()
  leased_at             timestamptz NULL
  processed_at          timestamptz NULL
  last_error_code       varchar(120) NULL
  ...timestamps()
  UNIQUE(notification_id, channel, target_key)
  INDEX(status, available_at)

push_subscriptions
  id                    uuid PK defaultRandom()
  user_id               text NOT NULL -> users.id ON DELETE CASCADE
  endpoint_hash         varchar(64) NOT NULL UNIQUE
  endpoint_ciphertext   text NOT NULL
  p256dh_ciphertext     text NOT NULL
  auth_ciphertext       text NOT NULL
  endpoint_fingerprint  varchar(16) NOT NULL
  user_agent_family     varchar(80) NULL             # normalized, not raw UA
  last_success_at       timestamptz NULL
  last_failure_at       timestamptz NULL
  disabled_at           timestamptz NULL
  ...timestamps()
  INDEX(user_id, disabled_at)

notification_settings
  user_id               text PK -> users.id ON DELETE CASCADE
  locale                varchar(2) NOT NULL CHECK en|fr|ar|es
  ...timestamps()
```

The endpoint hash is globally unique, not merely unique per user. Endpoint and
key material are encrypted at rest through the installed Najm encryption
service; the deterministic hash enforces uniqueness and a short non-secret
fingerprint supports diagnostics. If the same browser is subscribed after an
account switch, authenticated upsert transfers the endpoint to the current user
so a former account cannot receive future pushes on that browser.

Database and DTO ceilings must bound endpoint, key, payload, aggregate ID, and
topic sizes. Push endpoints and keys never appear in API reads, audit metadata,
outbox payloads, logs, or diagnostics. Operational output uses only the
endpoint fingerprint.

`read_at` is application-write-once: `markRead` changes NULL to one timestamp;
an already-read row is returned without an update. No API can clear it. The DB
also checks that a non-null `read_at` is not earlier than `created_at`.

There is no automatic notification purge in v1. Rows are user-lifetime durable
and cascade only when the owning auth user is permanently deleted. A future
retention policy requires a separate plan and legal/product decision.

### 3.3 Claiming, retry, and dead-letter rules

- Claim `pending`/retryable `failed` rows whose `available_at <= now()`.
- A claim atomically sets `processing`, `leased_at`, and increments attempts.
- A stale processing lease is reclaimable after five minutes.
- Retry sanitized transient failures with bounded exponential backoff and
  jitter: 1, 5, 15, 60, and 360 minutes.
- After six failed attempts, mark the job `dead`; never busy-loop.
- Invalid/unknown topics are code-contract failures and dead-letter with a
  bounded code such as `unsupported_topic`; do not silently mark them sent.
- Email with no currently verified recipient address becomes `skipped` with
  `no_verified_email`. No address is stored in the delivery row.
- Push `404`/`410` disables the subscription and completes that target as
  `skipped`; transient provider/network errors retry.
- One failed recipient or channel never rolls back another recipient's inbox.
- Dispatcher and delivery methods are idempotent under replay and concurrent
  workers through the unique keys above.

For new events, `outbox_events.status/processed_at` means dispatch into the
notification consumer completed; it does not claim that email or push reached
every target. `notification_deliveries` is authoritative for external-channel
state. Historical applicant events retain their old meaning and are not
rewritten.

### 3.4 Locale resolution

Locale is snapshotted onto the notification when fan-out occurs so retries do
not change language:

1. applicant event locale captured during OTP/application;
2. recipient `notification_settings.locale`;
3. Arabic for a family recipient;
4. English for sponsor, operator, or admin fallback.

Changing the authenticated UI language also updates notification settings via
an explicit command. This is a global delivery-language preference, not a
per-topic notification preference. In-app rows render using the current UI
locale; the snapshot is used for email and push generated at event time.

### 3.5 Topic registry and recipient resolution

Implement one exhaustive typed registry. Do not use a wildcard `order.*`
branch as the source of truth.

```text
contribution.submitted
contribution.recorded
contribution.validated
contribution.rejected
contribution.refunded
contribution.expired

order.submitted
order.assisted_submitted
order.approved
order.rejected
order.purchase_recorded
order.purchase_replaced
order.delivery_assigned
order.delivery_reassigned
order.delivery_started
order.delivery_failed
order.delivered
order.cancelled

family.fundingActivated
applicant.approved
applicant.rejected
```

Adding a new emitted outbox topic must fail a source-contract test until the
registry explicitly maps it or marks it intentionally ignored.

Recipients:

```text
contribution.*
  sponsor user owning the contribution
  family user owning the receiving budget

order.*
  family user owning the order
  sponsor users whose support assignment covered the family at event.created_at

family.fundingActivated
  family user
  sponsor users whose assignment covered the family at event.created_at

applicant.approved / applicant.rejected
  applicant auth user
```

Assignment resolution is temporal, based on the event occurrence timestamp,
not merely current assignment state. Current account existence/status is still
checked before external delivery. A rejected applicant may have an inaccessible
inbox row while inactive; email remains the usable decision channel and the row
becomes historical if that identity is later re-approved.

Admin and operator users receive no broadcast notifications in v1. They may
receive only events for which they are explicitly a mapped personal recipient;
the initial registry has none.

Payloads use topic-specific allowlists built after the shared outbox sanitizer.
No generic event payload is passed directly into an API response, email
template, push body, log, or client formatter.

## 4. Backend API and authorization

Create a Najm-shaped `packages/server/src/modules/notifications/` module with
controller, DTO, guards, repository, service, validator, schemas, topic
registry, recipient resolver, template builder, and delivery adapters.

```text
GET    /notifications
       listMine(?cursor=&limit=&unread=&topic=)

GET    /notifications/unread-count
       -> { count }

GET    /notifications/settings
       -> { locale }

PUT    /notifications/settings
       { locale }

PATCH  /notifications/:id/read
       own row only; idempotent

PATCH  /notifications/read-all
       no body; one SQL statement marks the caller's unread rows visible in
       that statement snapshot and returns { read }

GET    /notifications/push-config
       -> { enabled, publicKey }

POST   /notifications/push-subscriptions
       bounded endpoint and base64url keys; globally unique endpoint transfer

DELETE /notifications/push-subscriptions
       authenticated removal by exact endpoint
```

All routes require authentication. Every inbox read/update is scoped by
`recipient_user_id = @User("id")`; admin has no override. Cross-user IDs return
404 and anonymous calls return 401. Services re-parse DTOs. Controllers remain
thin and use Najm validation, policies, response messages, and DI.

`markAllRead` is one scoped SQL update. PostgreSQL statement-snapshot semantics
mean concurrent rows not visible to that statement remain unread; the command
returns the exact affected count. It does not loop until the count reaches zero.

Add notifications capabilities to controller policy, seed definitions, role
grants, `seed:verify`, and denial tests together. MCP may expose `listMine`,
`unreadCount`, and confirmed `markRead`; it must not expose subscriptions,
VAPID configuration, worker operations, or cross-user reads.

## 5. Channel matrix

```text
topic                              in-app  family push  sponsor push  sponsor email  applicant email
contribution.submitted             yes     no           no            no             n/a
contribution.recorded              yes     no           no            no             n/a
contribution.validated             yes     yes          yes           yes            n/a
contribution.rejected              yes     yes          yes           yes            n/a
contribution.refunded              yes     no           no            no             n/a
contribution.expired               yes     no           no            no             n/a
all order topics except terminal   yes     no           no            no             n/a
order.delivery_failed              yes     yes          yes           yes            n/a
order.delivered                    yes     yes          yes           yes            n/a
family.fundingActivated            yes     yes          yes           yes            n/a
applicant.approved                 yes     n/a          if subscribed n/a            yes
applicant.rejected                 yes     n/a          no            n/a            yes
```

Families are never emailed in v1. Missing verified email or push subscription
is a normal skip, not a domain-operation failure. The registry is the single
source used by worker logic and tests.

Email uses Najm `EmailService` with escaped topic-specific view models, both
plain-text and HTML forms, localized subject/body, and `dir="rtl"` for Arabic.
The worker resolves the current verified address just before sending and never
persists or logs it. Existing applicant direct-send code and its outbox-status
handling are removed only when dispatcher coverage is green, preventing double
delivery.

Push payload is bounded to `{ notificationId, title, body }`. It contains no
arbitrary URL or private domain payload. Notification click always opens the
same-origin canonical path `/notifications?focus=<notificationId>`.

## 6. Frontend

Create one shared `apps/web/src/features/Notifications/` implementation:

```text
components/NotificationBell.tsx
components/NotificationPopover.tsx
components/NotificationsPage.tsx
components/NotificationCard.tsx
components/PushOptIn.tsx
hooks/useNotifications.ts
hooks/useNotificationCommands.ts
lib/buildNotificationViewModel.ts
config/notificationColumns.tsx
types.ts
index.ts

apps/web/src/services/notificationsApi.ts
apps/web/src/app/(dashboard)/notifications/page.tsx
```

- `DashboardShell` owns one notification bell so every authenticated dashboard
  route gets it. The existing page-specific global action component does not
  own another copy.
- Add one `/notifications` navigation destination for every role.
- Use Najm Kit primitives for indicator, button, popover/sheet, scroll, page,
  table/cards, badges, loading/error/empty states, and feedback.
- The unread-count query alone polls every 30 seconds. List queries refetch on
  bell open, page entry, and command invalidation. Do not change global query
  defaults and do not add Zustand.
- Badge: hidden at zero, localized number for 1-99, `99+` above 99.
- Opening the popover does not mark rows read. Opening a notification marks it
  read after its detail/focus action succeeds. `markAllRead` performs one
  snapshot-scoped server command.
- Cursor order is `(created_at DESC, id DESC)`; new rows do not reorder or skip
  older pages already fetched.
- The view-model registry maps every topic to localized title/body, semantic
  icon/token, and role-safe canonical destination. Unknown topics render a
  generic safe inbox row and never interpolate raw payload values.
- Language changes update both the existing UI cookie and notification locale;
  failure to sync external-channel locale must not block the UI language
  change and is retried on the notification surface.
- Verify keyboard operation, focus return, `aria-live` count changes, pending
  states, mobile safe areas, table/card parity, Arabic RTL, and long translated
  copy.

## 7. Web push and Najm package boundary

Do not fork the installed offline worker source in Kafil. First extend
`najm-next/pwa` in the Najm repository with a reusable, typed push option that:

- preserves the current network-only authenticated/API behavior and offline
  document fallback;
- validates bounded JSON push payloads;
- calls `showNotification` with configured default icon/badge;
- stores only `notificationId` in notification data;
- handles `notificationclick` by constructing a fixed same-origin notification
  route, focusing an existing client or opening a new one;
- contains no Kafil brand name, route literal, or translation;
- is covered by worker-source and browser service-worker tests.

Publish the verified Najm release, wait for registry availability, pin it in
Kafil overrides/lockfile, and verify the packed artifact. Only then configure
Kafil's `/sw.js` route with its icons and `/notifications` route.

Server push uses a small adapter around a maintained Web Push dependency added
with Bun. Required variables:

```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_CONTACT_EMAIL
NOTIFICATIONS_DISPATCH_ENABLED
NOTIFICATIONS_EMAIL_ENABLED
NOTIFICATIONS_PUSH_ENABLED
```

Add names only to root and deployment example files. Production values are
generated on the VPS; build-stage values are throwaway and never deployed.
Expose only the public key through `/notifications/push-config`.

`PushOptIn` requests permission only after a user gesture. It handles secure-
context, unsupported, denied, granted, expired-subscription, account-switch,
and unsubscribe states. iOS guidance explains that web push requires installing
the app to the Home Screen; v1 does not add a separate promotional install
campaign.

## 8. Implementation phases

### Phase A - durable event consumption and inbox backend

Status: **complete** (single additive migration `0045_salty_hobgoblin`;
`notifications-database.test.ts` drives `OutboxService`,
`NotificationRepository`, `NotificationService`, the recipient/locale
resolvers, dispatcher, and anonymous HTTP authorization through real
PostgreSQL/Najm paths; the Phase A source tests, DB integration gate, and
schema-drift check pass).

1. [x] Export and strengthen the shared payload sanitizer.
2. [x] Add all five tables, checks, indexes, FKs, and migration-content tests.
3. [x] Make `OutboxService.enqueue()` create `notifications-v1` consumer jobs
   in the same surrounding transaction and persist the optional actor ID.
   Existing rows get no jobs.
4. [x] Add claim, lease recovery, retry, dead-letter, idempotency, exhaustive
   topic registry, temporal recipient resolution, locale resolution, and
   fan-out.
5. [x] Add inbox/settings API, policies, permissions, seed grants, MCP-safe
   tools (`listMine`, `unreadCount`, confirmed `markRead` only), audit
   metadata, and privacy projections. Notification mutations share one
   transaction with their audit write; consumer/outbox completion is a single
   atomic statement.
6. [x] Move applicant decision enqueue into the decision transaction. Keep the
   old direct email temporarily until Phase C is ready, but stop that
   temporary sender from mutating generic outbox status and prevent the new
   worker from creating applicant email jobs behind an explicit channel flag.

### Phase B - in-app frontend

Status: **implementation complete; deployment/connected acceptance pending**.

1. [x] Add typed service clients, keys, queries, commands, and invalidations.
2. [x] Add shell-owned bell/popover and the shared notifications page/navigation.
3. [x] Add topic view models and all four locales.
4. [x] Add notification-locale synchronization and source-covered accessibility/
   responsive contracts.
5. [ ] Deploy with worker fan-out enabled for in-app only; verify before external
   channels are activated.

### Phase C - durable email

Status: **implementation complete; delivery acceptance pending**. Email
delivery jobs, topic-specific plain-text/HTML templates, verified-address
lookup, family exclusion, skip, retry, dead-letter, escaping, locale, and
idempotent job creation are covered by fake-provider source tests and
PostgreSQL integration tests. The dispatcher is the single owner of applicant
decision email and the legacy direct sender is removed. External email
transport is at-least-once, not exactly-once: a worker crash between the
provider send and the delivery row's `sent` mark leaves a processing job that
the five-minute stale-lease reclaim will redeliver. The unique
`(notification_id, channel, target_key)` key prevents duplicate jobs, not
duplicate transport; every send carries a stable `X-Kafil-Delivery-Id`
header so a redelivery correlates with its first attempt. Mailpit must still
prove one decision email per applicant decision on the normal path (no legacy
duplicate), which is a single-owner property, not a crash-window guarantee.

1. [x] Add email delivery jobs and topic-specific plain-text/HTML templates.
2. [x] Prove verified-address lookup, family exclusion, skip, retry, dead-letter,
   escaping, locale, and idempotency behavior with fake provider tests.
3. [ ] Prove applicant decision delivery in Mailpit. (Pending: this is the
   remaining delivery-acceptance gate for Phase C.)
4. [x] In the same release, enable dispatcher-owned applicant email and remove the
   old direct-send/markDelivered path. Never run both owners concurrently.

### Phase D - shared push foundation

Status: **complete**. `najm-next@0.3.0` owns the typed, bounded push payload and
same-origin click contract; package source/runtime tests, build output, public
API snapshot, npm tarball contents, registry integrity, Kafil's exact
override/lockfile pin, focused PWA tests, full root gate, and PostgreSQL gate
all pass. Real-device display remains a separate Phase E acceptance gate.

1. [x] Implement, test, publish, and verify the `najm-next` push contract.
2. [x] Consume the exact release in Kafil.
3. [x] Add VAPID config validation, push adapter, subscriptions, endpoint transfer,
   pruning, retries, delivery jobs, and source tests.
4. [x] Add PushOptIn and service-worker configuration.

### Phase E - deployment and acceptance

1. [x] Add `notifications-worker` to production Compose with least privilege,
   restart policy, log rotation, Redis heartbeat healthcheck, and no ports.
   The worker uses the internal backend network plus a worker-only egress
   network so Resend/Web Push remain reachable without exposing ingress.
2. [x] Update deployment verification to prove app and worker use the same exact
   image revision and that migrations completed.
   Verification compares container image IDs and OCI revisions and requires
   migration `0045` in the Drizzle journal, not merely tables with matching
   names. First-rollout rollback supports a previous Compose file that has no
   notification worker.
3. [ ] Roll out in-app, then email, then push. Each channel has an independent
   activation variable (`NOTIFICATIONS_DISPATCH_ENABLED`,
   `NOTIFICATIONS_EMAIL_ENABLED`, and `NOTIFICATIONS_PUSH_ENABLED`) so rollback
   can stop new fan-out/channel jobs without deleting inbox data or migrations.
   The activation plumbing and fail-closed defaults are implemented; the live
   staged rollout has not been performed.
4. [ ] Record publication, deployment, worker health, delivery, and connected-
   acceptance evidence separately.

## 9. Tests

### 9.1 Backend source tests

- [x] DTO size/format boundaries, global endpoint ownership, and locale validation.
- [x] Exact role grants; own-row access; anonymous 401; cross-user/admin 404.
- [x] Exhaustive emitted-topic registry and explicit unknown-topic dead-letter.
- [x] Exact recipient sets, temporal assignment boundary, and no admin/operator
  broadcast.
- [x] Per-topic channel matrix including family email exclusion.
- [x] Sanitized topic payload and projections; no CIN, address, documents, notes,
  evidence, phone, email, endpoint, keys, or raw provider errors.
- [x] Locale precedence and snapshot stability.
- [x] HTML escaping and plain-text parity.
- [x] Applicant email has exactly one owner after Phase C.
- [x] MCP discovery and seed verification updated together.

### 9.2 PostgreSQL integration (`bun run test:db`)

- [x] Domain rollback removes outbox event and consumer job together.
- [x] New events create exactly one consumer job; pre-activation events create none.
- [x] Concurrent workers claim each consumer/delivery once with `SKIP LOCKED`.
- [x] Stale leases recover; retry schedule and dead-letter threshold hold.
- [x] Fan-out replay creates one inbox row per `(event, recipient)`.
- [x] Concurrent subscription transfer leaves one endpoint hash owned by one user,
  and database scans find no plaintext endpoint or key material.
- [x] Concurrent `markAllRead` respects its boundary and leaves later inserts
  unread; unread count converges.
- [x] `markRead` replay performs no second update and cannot clear `read_at` through
  any repository command.
- [x] User deletion cascades inbox/settings/subscriptions; actor deletion sets
  `actor_user_id` NULL without deleting recipient history.

### 9.3 Frontend source tests

- [x] Query-key family, 30-second count polling only, and complete invalidation.
- [x] Shell contains exactly one bell and every role has the inbox route.
- [x] Badge zero/number/99+ behavior.
- [x] Every registry topic and safe unknown fallback.
- [x] No raw payload interpolation or unsafe deep link.
- [x] Push unsupported/denied/granted/account-switch/unsubscribe states.
- [x] Language sync failure does not block UI language changes.

### 9.4 Connected real-service acceptance

All real-service UI/API, Mailpit delivery, notification ownership, subscription,
responsive/RTL, cleanup, and diagnostic scenarios are owned by section 12 of
`CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md`. This implementation plan defines
no E2E suite and does not treat local source or PostgreSQL checks as external-
delivery evidence.

## 10. Migration, rollout, and rollback

- Generate one additive migration for the tables and indexes. Review every
  statement; rerunning `db:generate` must report no schema changes.
- Do not backfill historical outbox events. Eligibility is represented by new
  consumer-job rows created only by new enqueue operations.
- Database migration may remain after rollback. Stop the worker or disable
  channel activation; do not drop tables during an emergency rollback.
- Deploy order: migration -> app and worker on the same image -> verify worker
  heartbeat -> enable in-app -> email -> push.
- With dispatch disabled, consumer jobs accumulate for an intentional later
  drain. With email or push disabled, newly fanned-out notifications do not
  create that channel's jobs; enabling a channel does not retroactively contact
  recipients unless a separately authorized backfill is designed.
- Channel activation affects creation of new delivery jobs. Existing pending
  jobs are either drained before disabling or left pending according to an
  explicit operator choice; never silently discard them.
- Update `.env.example`, `deploy/env/app.env.example`, Compose, deployment
  verification, backup coverage, and operational documentation without exposing
  resolved secrets.
- Backup/restore rehearsal must include notification, delivery, consumer-job,
  settings, and subscription tables. Push subscriptions are credentials and
  must receive the same restricted backup handling as other secrets.

## 11. Verification gates

Every implementation slice closes with:

```bash
bun run lint && bun run typecheck && bun run test && bun run build && bun run db:generate
```

Database/worker slices also require:

```bash
bun run test:db
```

Connected-acceptance claims require section 12 of
`CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md`. Push package work additionally
requires Najm source tests, packed
artifact verification, registry verification, exact consumer pin/lockfile, and
Kafil gates.

Completion is reported as separate states:

```text
architecture agreed
implementation complete
database/concurrency verified
Najm package published and consumed, if applicable
Git changes published
production migrated and deployed
worker healthy
in-app connected acceptance passed
email delivery accepted
push subscription accepted
real device push delivery accepted or explicitly not verified
```

No phase may use source tests as proof of deployment, provider configuration as
proof of delivery, or a passing browser journey as proof of database locking.

## 12. Final acceptance checklist

- [x] New domain events atomically create one `notifications-v1` consumer job.
- [x] Historical pending outbox rows do not backfill.
- [x] Worker claiming, retry, stale-lease recovery, and dead-letter behavior pass.
- [x] Every emitted topic is mapped or intentionally ignored.
- [x] Recipient resolution is event-time correct and privacy-safe.
- [x] Inbox ownership and read-only lifecycle pass in local source/PostgreSQL tests
  for all four role policies.
- [x] No admin/operator broadcast exists.
- [x] Families receive no email.
- [x] Applicant decisions create email through exactly one owner (the dispatcher).
- [ ] Mailpit proves a single applicant-decision delivery on the normal path with
  no legacy duplicate.
- [x] Email and push failures never roll back domain events or inbox rows.
- [x] Push endpoints/keys and provider errors never leak.
- [x] Najm service-worker push support is published and exactly pinned.
- [x] Shell renders exactly one accessible notification bell by source contract.
- [x] Polling is limited to unread count at 30 seconds.
- [x] English, French, Arabic, and Spanish source copy/parity checks pass.
- [ ] Arabic RTL and all-locale connected acceptance pass.
- [x] Migration `0045`, the full local gate, PostgreSQL integration, and
  schema-drift checks pass.
- [ ] Production worker health, Mailpit delivery, and connected evidence pass.
- [ ] Production app and worker run the same confirmed revision.
- [ ] Real-device push delivery is proved separately (currently `NOT VERIFIED`).
