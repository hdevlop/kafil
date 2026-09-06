# Notification system plan (v1 — in-app + email + push, polling, read/unread only)

Status: **DRAFT — implementation-ready, not implemented**

This is a task-specific root plan. It does not replace any other plan and
claims no project-wide phase status. There is no root `PLAN.md`.

Decisions confirmed with user:

```text
channels  = in-app + email + push
freshness = polling (30s unread-count refetch, no WS/SSE in v1)
triggers  = all domain events (every durable outbox topic fans out in-app)
retention = read/unread only (markRead + markAllRead, append-only, no delete,
            no per-type preferences in v1)
```

The anti-spam rule is: **in-app always; email + push only for the high-value
subset** (§3.4). Confirming "all three channels" does not mean every event
fires all three channels — that would triple-notify operators on every order
edit.

Out of scope for v1: per-type mute preferences, notification deletion,
SMS/WhatsApp, realtime sockets/SSE, digest batching, admin broadcast console.

## 1. Goal

Give every authenticated user (admin, operator, family, sponsor) a persistent,
privacy-safe notification inbox covering the events the platform already
records as durable outbox topics, delivered in-app (bell + history page),
by email for high-value transitions, and by web push for the same high-value
subset — with polling freshness and append-only read state.

## 2. Current state (verified)

- There is no notification module, table, controller, API route, bell, inbox
  page, push subscription, or realtime channel. `**/*notif*` matches no file;
  `notification|bell|inbox` matches nothing product in `apps/web/src`;
  `EventSource|WebSocket|PushManager|refetchInterval` matches nothing in
  `apps/web/src`.
- The event backbone already exists and is the fan-out source:
  `packages/server/src/modules/outbox/outboxSchema.ts:6` (`outbox_events`:
  `id, topic, aggregate_type, aggregate_id, payload, status, attempts,
  available_at, processed_at, last_error`) and
  `packages/server/src/modules/outbox/outboxService.ts:16-23` (`enqueue`) with
  `sanitizePayload():41-57`, which already drops keys matching
  `password|token|secret|authorization|address|cin|document|housing|
  registration|priority|notes|phone|email|birth|guardian` (CIN/address
  privacy rule). The outbox module exports no controller
  (`src/modules/outbox/index.ts`), so it is internal only.
- Enqueue call sites (the v1 trigger inventory — all become in-app
  notifications):
  - `contributionService.ts:347,401,480,517,593,731` —
    `contribution.submitted/recorded/validated/rejected/refunded/expired`,
    each paired with `audits.record()` inside `@Transaction`.
  - `orderService.ts:645,1080,1637,1731` — `order.purchase_replaced`,
    dynamic `` `order.${action}` ``, `` `order.delivery_${action}` `` via
    shared `recordStatusEvent/recordDeliveryEvent` helpers.
  - `fundingService.ts:257-275` — `family.fundingActivated`.
  - `applicantService.ts:44-45` — `applicant.approved/rejected`; the only
    end-to-end outbox→email consumer today is
    `deliverDecisionNotification():542-583` (`enqueue` best-effort →
    localized HTML → `email.sendHtml()` → `markDelivered/markDeliveryFailed`).
- Delivery channel today: `najm-email` via
  `packages/server/src/config/emailConfig.ts:13`, wired in
  `packages/server/src/server.ts:47-48`. Local default is
  `EMAIL_PROVIDER=console` (`.env.example:41`). No `najm-push`,
  `najm-realtime`, or `najm-notifications` package exists; realtime scan of
  `najm-*/dist/**/*.d.ts` finds no socket/push/subscription bus (only MCP's
  own `sse` transport, which is not app notifications).
- Auth/guard pattern to reuse: actor from `@User("id")`, class `@Policy(X)` +
  method `@Can*` (`settingController.ts:21-28,48-62`), ownership via
  `definePolicy(table, resource, { adminRoles }).for(role, join/where)` —
  e.g. sponsor `where(sponsorProfiles.userId)`, family
  `where(familyProfiles.userId)`, contributions dual join
  (`contributionGuards.ts:17-27`). Notifications are per-auth-user, not
  per-profile: scope is `recipient_user_id = @User("id")`. Admin keeps its
  super-role everywhere else but reads only its own notifications — same
  principle as "admin satisfies guards but does not own a family profile".
- Frontend pattern to reuse: thin routes (`(dashboard)/orders/page.tsx:1-14`),
  `features/<Feature>/{components,hooks,lib,config,types,index.ts}`,
  `services/*Api.ts` thin over `services/http.ts`, `useEntityQuery`
  (`hooks/useEntityQuery.ts:19-27`) + `useEntityCommand`
  (`hooks/useEntityCommand.ts:26-59`, `toast.success/error` from `najm-kit`),
  `entityKeys` (`hooks/queryKeys.ts:3-12`). `QueryProvider.tsx:23-25`
  sets `staleTime: 60_000, refetchOnWindowFocus: false` — polling must be
  explicit per-query (`refetchInterval`), not global.
- Bell slot today: none. `PageHeaderGlobalActions.tsx:28-116` renders only
  language dropdown, theme toggle, fullscreen (per-page opt-in, e.g.
  `OrdersPage:509`). `DashboardShell/index.tsx:51-142` renders sidebar +
  children + `OrderCartOverlay` only. `DASHBOARD_NAV`
  (`navigation.ts:55-148`) has no notifications entry.
- Kit primitives available (`najm-kit@2.11.19`): `NIndicator` (dot/badge
  overlay — bell badge), `NPageHeader`, `NDialog/useDialog`, `NSheet`,
  `DropdownMenu`, `Popover`, `ScrollArea/NajmScroll`, `Toaster/toast`,
  `NCard`, `NTable`, `NBadge`, `NEmptyState/NErrorState/NLoadingState`.
  No hand-built substitutes.
- Service worker is offline-shell only:
  `apps/web/src/app/sw.js/route.ts:1-7`
  (`createNajmServiceWorker({ cacheId: "kafil-shell", offlineUrl,
  precache: [icons] })`). Push handling is new work; the exact
  `najm-next/pwa` push extension point must be read from installed
  declarations during Phase D — do not assume its API.
- Localization: server `src/locales/{en,fr,ar,es}.json` + `index.ts:30-45`
  (`defineI18n`, ar rtl), parity enforced by
  `test/locale-parity.test.ts` (every English leaf key in fr/ar/es, no
  English-copy values outside the allowlist). Applicant decision email copy
  is hardcoded 4-locale in `applicantService.ts:77-141` (precedent for email
  copy when the `ui` scope does not fit).
- Runtime: single Next.js process; `apps/web/src/app/api/[...route]/route.ts`
  is the only backend entrypoint (`nodejs`, `force-dynamic`). No second
  server may be introduced for push or streaming.

## 3. Design

### 3.1 Storage

New tables in a Najm-shaped `packages/server/src/modules/notifications/`
feature module (no edits to deployed migrations; `bun run db:generate`
creates one new migration):

```text
notifications
  id                 uuid PK defaultRandom()
  recipient_user_id  uuid NOT NULL -> users.id (FK, cascade on user delete)
  actor_user_id      uuid NULL     -> users.id (who caused it, nullable: system)
  topic              varchar(120) NOT NULL      (mirrors outbox topic)
  aggregate_type     varchar(80)  NOT NULL
  aggregate_id       text         NOT NULL
  payload            jsonb NOT NULL (sanitized scalars only, same allowlist
                     shape as OutboxService.sanitizePayload)
  read_at            timestamptz NULL (NULL = unread; set once, never cleared)
  ...timestamps()
  index (recipient_user_id, read_at, created_at DESC)
  index (aggregate_type, aggregate_id)

push_subscriptions
  id          uuid PK defaultRandom()
  user_id     uuid NOT NULL -> users.id (FK, cascade on user delete)
  endpoint    text NOT NULL
  p256dh      text NOT NULL
  auth        text NOT NULL
  user_agent  text NULL
  ...timestamps()
  unique (user_id, endpoint)
  index (user_id)
```

Rules: camelCase TS identifiers, snake_case PG names. `read_at` is
write-once (explicit `markRead`/`markAllRead` commands; no generic update,
no delete endpoint, no balance/status mutation of any kind). Notification
payloads carry IDs + display-safe scalars only — never CIN, exact address,
documents, evidence, notes, email, or phone (reuse the outbox sanitizer;
add a shared helper rather than forking the regex).

### 3.2 Recipient resolution (fan-out map)

Fan-out inserts happen in the **same `@Transaction`** as the domain mutation,
after `audits.record()` + `outbox.enqueue()`, so a notification row can never
exist without its committed domain event (and rollback removes both).
Each topic maps to recipients resolved from the already-locked rows
(lock order unchanged: inventory first, then budget — notifications add no
new lock, they insert):

```text
contribution.submitted/recorded/validated/rejected/refunded/expired
  -> sponsor user of contribution.sponsorProfileId (own contributions)
  -> family user(s) of contribution.familyProfileId (own budget)
  -> operators/admins? NO in v1 (they have list pages; avoids broadcast storms)
order.* / order.delivery_*
  -> family user of the order's familyProfileId
  -> sponsor user(s) with an active support assignment to that family
     (privacy-safe projection only: amounts the sponsor may already see)
family.fundingActivated
  -> family user(s) of that family (in-app + push; never email)
  -> sponsor users with an active support assignment to that family
     (in-app where their own inbox shows it, plus the email copy —
     they funded it, the family cannot be emailed)
applicant.approved / applicant.rejected
  -> applicant.authUserId (the decision email already targets this user)
```

Sponsor projections must reuse the existing sponsor-safe serializers —
guardian CIN, exact address, documents, and operational notes stay out of
notification payloads, emails, push bodies, and logs (same rule as audit
metadata).

### 3.3 Backend API (explicit commands)

`NotificationController` under `/notifications` (thin: decorators, validated
input, `@User("id")`, delegation; all responses via `@ResMsg` keys added to
all four locales):

```text
GET    /notifications             listMine (paginated, ?unread=true, ?topic=)
GET    /notifications/unread-count unreadCount -> { count }
PATCH  /notifications/:id/read    markRead (own row, idempotent: already-read
                                  returns success without rewrite)
PATCH  /notifications/read-all    markAllRead (own rows only, returns { read })
POST   /notifications/push-subscriptions        subscribePush (upsert by
                                  (user_id, endpoint), zod-validated keys)
DELETE /notifications/push-subscriptions        unsubscribePush (by endpoint)
```

Guards: authenticated any-role + ownership `recipient_user_id = @User("id")`
(`definePolicy(notifications, "notifications", …).for(each role,
where(notifications.recipientUserId))`, admin included but scoped to self —
admin has no cross-user inbox in v1). DTOs with `najm-validation`/zod at
every boundary; service re-parses DTOs (defense in depth). Denial tests:
cross-user read/mark returns 404 (not 403, to avoid ID oracle), unauthenticated
returns 401. MCP: `list`/`unread-count` as read-only tools, `markRead` with
confirm + discovery tests kept in sync. Seed: add the `notifications`
policy capabilities to role grants + `seed:verify` expectations with the
other policy updates (backend skill: controller policy, seed definitions,
grants, verification, denial tests change together).

### 3.4 Channel matrix (anti-spam)

```text
topic pattern                       in-app   email*  push
contribution.submitted/expired      yes      no      no
contribution.validated/rejected     yes      yes     yes
contribution.recorded/refunded      yes      no      no
order.* (purchase/review/replace)    yes      no      no
order.delivery_*                    yes      yes*    yes*
family.fundingActivated             yes      yes     yes
applicant.approved/rejected         yes      yes     yes
* delivery_* email+push only for terminal legs (delivered/failed),
  not every courier scan.
* email column = sponsor/operator/applicant recipients only. Family
  recipients are never emailed in v1 (many have no mailbox; low-literacy
  text email is the wrong medium) — in-app + push only, skip silently
  when no verified email is on record.
```

Email reuses `EmailService.sendHtml` with the applicant-decision precedent
(localized subject/body, `ar` → `dir="rtl"`); copy lives with the
notification module (4-locale table like `applicantService.ts:77-141`) and
is covered by the locale-parity test via matching server-locale keys for
API messages. Push payload is title + body only (no PII beyond what the
recipient may already see); clicking opens the canonical deep link
(`/notifications?focus=<id>`), resolved client-side.

Recipient-aware email rule (many families have no mailbox): **family
recipients are never emailed in v1** — they get in-app + push only. The
email step skips any recipient with no verified email on record silently
(no failure, no retry, no log line with the address). Email therefore
applies to sponsor/operator/applicant recipients only. Inbox rows are
still fanned out to families normally; the inbox is their durable channel
alongside operator-assisted flows.

Low-literacy copy rule: notification titles are short, amount-first
(`500 MAD received`, not `Contribution #c_123 transitioned to validated`),
plain words, and every status is redundantly coded icon + color + text so
the meaning survives without reading the sentence. Family-facing defaults
assume `ar` unless the profile prefers otherwise.

### 3.5 Frontend

New `apps/web/src/features/Notifications/` (PascalCase dir, one shared
surface — no per-role copies; gate text inside, backend stays authoritative):

```text
components/NotificationBell.tsx      NIndicator(badge=unread) + Popover/
                                     DropdownMenu + ScrollArea recent list,
                                     keyboard-operable, focus restoration,
                                     aria-live for count changes
components/NotificationsPage.tsx     NPageLayout + DashboardPageHeader +
                                     NTable (desktop) / cards (mobile),
                                     unread filter + topic filter,
                                     markRead/markAllRead actions
components/PushOptIn.tsx             permission request + subscribe/
                                     unsubscribe, graceful denied/
                                     unsupported states
hooks/useNotifications.ts            useEntityQuery list + unread-count
                                     (refetchInterval: 30_000 on count only)
hooks/useNotificationCommands.ts     useEntityCommand markRead/markAllRead/
                                     push subscribe, invalidates
                                     [notifications] families
lib/buildNotificationViewModel.ts    topic -> translation key + deep link +
                                     status token (no money math client-side)
config/notificationColumns.tsx       column/field definitions
services/notificationsApi.ts         typed clients: list/unreadCount/
                                     markRead/markAllRead/subscribe/unsubscribe
```

Wiring: bell mounts in `PageHeaderGlobalActions` (first global slot that
reaches every dashboard page); `/notifications` route added thin
(`app/(dashboard)/notifications/page.tsx` → feature page, `Suspense`
pattern) + `DASHBOARD_NAV` entry visible to all roles (inbox is per-user,
so roles share one page). Copy in the existing en/fr/ar/es system
(`UiTranslationKey`); verify ar RTL and mobile safe-areas. No Zustand —
server state stays in React Query; no client price/total computation.

### 3.6 Push (Phase D, isolated)

Server: VAPID keypair, new env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_CONTACT_EMAIL`) added to root `.env.example`,
`deploy/env/app.env.example`, and `deploy/env/infrastructure.env.example`
as applicable; Docker build stage keeps throwaway values (never valid at
runtime). A minimal push sender (new `web-push`-style dep via `bun install`
— root `overrides` stay pinned; no other package changes) sends to a
user's subscriptions best-effort after commit (failure marks nothing;
subscriptions returning 410/404 are pruned). Client: `PushOptIn` uses
`pushManager.subscribe(VAPID_PUBLIC)` then `POST push-subscriptions`;
SW push/click handlers extend the `najm-next/pwa` worker — read the
installed `najm-next` declarations first; if the helper owns the `push`
event, extend through its contract, else a narrow Kafil-owned handler file
that does not fork the offline shell.

## 4. Backend implementation tasks (`packages/server`)

1. `notifications/NotificationSchema.ts` — tables + indexes + checks above;
   export via feature `index.ts`; compose (only) in `database/schema.ts`.
2. `notifications/NotificationDto.ts` — list query (cursor/page, `unread`,
   `topic`), `markRead` params, push subscription body (endpoint URL,
   p256dh/auth base64url lengths), all zod.
3. `notifications/NotificationGuards.ts` — `definePolicy` + `CanList/CanRead/
   CanUpdate(read-only semantics)` re-exported from `config/authConfig.ts`.
4. `notifications/NotificationRepository.ts` — `listForUser`,
   `countUnreadForUser`, `insertMany`, `markReadForUser` (idempotent),
   `markAllReadForUser`, push `upsert/remove/prune/listForUser`.
5. `notifications/NotificationService.ts` — DI (`NotificationRepository`,
   `AuditService`, `EmailService`, push sender); `@Transaction` fan-out
   helper `fanOut({topic, aggregateType, aggregateId, recipientUserIds,
   actorUserId, payload, channels})` inserting rows + enqueueing email/push
   intents; explicit `listMine/unreadCount/markRead/markAllRead/
   subscribePush/unsubscribePush` (no generic update/delete).
6. `notifications/NotificationController.ts` — routes in §3.3 with
   `@Policy`, role guards, `@Validate`, `@ResMsg`, `@McpTool` metadata.
7. `notifications/NotificationValidator.ts` — reusable existence/ownership
   checks (`ensureOwnNotification`).
8. Fan-out call sites (same transactions, after audit+outbox): contribution
   service (6 topics), order service helpers (`recordStatusEvent/
   recordDeliveryEvent`), funding service, applicant decision paths.
9. Email copy table (4 locales) + channel matrix constant with per-topic
   unit coverage.
10. Seed: `notifications` capabilities in role grants + `seed:verify`
    expectations; permissions locale keys in all four `locales/*.json`.
11. `bun run db:generate` — review every statement; record any
    rename/create decision in phase evidence (greenfield tables expected,
    no backfill).

## 5. Frontend implementation tasks (`apps/web`)

1. `services/notificationsApi.ts` + `features/Notifications/hooks/
   notificationKeys.ts` — `all/list/detail/unread-count` key family.
2. `useNotifications` (list, paginated, `unread`/`topic` filters) +
   `useUnreadCount` (`refetchInterval: 30_000`, no global QueryProvider
   change) + `useNotificationCommands` (markRead/markAllRead/push
   subscribe, invalidate all `[notifications]` families, awaited mutations
   before dialog close/navigation, shared-command error presentation).
3. `NotificationBell` in `PageHeaderGlobalActions` + `/notifications` page
   + nav entry (`labelKey`, all roles, `HeartHandshake`-neutral icon —
   do not reuse a finance/catalog icon).
4. `PushOptIn` + VAPID public key plumbing (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   or server-provided `/notifications/push-config` — decide at
   implementation; never expose the private key).
5. PWA install flow (unlocks push on iOS, badge + standalone open on
   Android): installability groundwork already exists (SW shell, icons,
   `offline.html`, `test/pwa.test.ts`, `README.md:68` "Add to Home
   Screen") — verify the manifest + criteria against the installed
   `najm-next/pwa` contract, add a one-tap "Install Kafil" prompt aimed
   at families (plain words, ar default), and cover installed-vs-browser
   behavior in the Phase D browser pass.
5. View-model builder mapping every §3.2 topic to translation key, deep
   link, and status token; unknown topics render a safe generic row (never
   crash on a new server topic).
6. a11y/RTL/responsive pass: keyboard operation, focus restoration,
   `aria-live` count, disabled/pending states, card-vs-table verification,
   `rtl:` checks, safe-area check for the bell popover.

## 6. Tests

### 6.1 Backend source tests

- DTO boundaries (bad endpoint/keys/topic filters rejected).
- Allowed roles (all four roles manage own inbox) + forbidden (cross-user
  404, anonymous 401, admin cannot read another user's row).
- Ownership scoping per §3.3; idempotent `markRead` replay.
- Privacy projections: payload/email/push body contain no CIN, address,
  documents, notes, phone, email (mirror `sanitizePayload` tests).
- Channel matrix: per-topic test asserting which of in-app/email/push fire.
- Audit/outbox pairing: fan-out rows only commit with the domain event
  (rollback test); outbox topics unchanged (existing consumers unaffected).
- MCP discovery expectations + seed authorization tests updated together.

### 6.2 Database integration (`bun run test:db`)

- Concurrent `markAllRead` vs inserts (no lost rows, count converges).
- FK cascade on user delete removes inbox + subscriptions.
- Unique `(user_id, endpoint)` under concurrent subscribe.
- `read_at` write-once (second `markRead` is a no-op success).

### 6.3 Frontend source tests (`apps/web`)

- Key builder covers every matrix topic + unknown-topic fallback.
- Query invalidation on markRead/markAllRead; unread-count polling
  configured (30s) without touching global provider defaults.
- Bell badge states (0 hides badge, N shows count, 99+ caps).
- Push opt-in states: granted/denied/unsupported.

### 6.4 Browser acceptance (`apps/web/test/e2e/`)

New spec (not part of `bun run test`; runner boots its own Next.js on
`127.0.0.1:3210` with a real database):

- Operator triggers contribution validation → sponsor + family inboxes show
  the row; bell count increments within the polling window; mark-read clears
  it; reload persists state.
- Applicant approve → applicant inbox + decision email both arrive (Mailpit
  boundary proven separately first per the Playwright skill).
- Cross-user isolation: sponsor cannot open family row URL (denied, stays
  safe — assert the exact 404 response, not merely "stayed on page").
- ar locale: bell + page render RTL with no clipped popover; keyboard-only
  open → mark-all-read → focus returns to bell.
- Push: permission-granted path subscribed (real `pushManager` in Chromium);
  denied path shows guidance, no console errors. Push *delivery*
  end-to-end is asserted only if a loopback push harness exists — otherwise
  assert subscribe/unsubscribe persistence + server prune on 410.
- Promotion ladder applies: focused work-unit + passive diagnostics first,
  then dependent range, then the affected spec; final gate per §8.

## 7. Migration, seed, rollout, and rollback

- `bun run db:generate` → one new migration (two tables + indexes + FKs).
  Never edit a deployed migration; `db:generate` must show no further diff
  after it. Frontend-only phases must produce no migration — stop and
  investigate drift if one appears.
- No backfill of historical events in v1 (inbox starts at deploy; historical
  outbox rows are audit trail, not inbox rows). If a backfill is later
  wanted, it is a separate `--apply` CLI like `theme:backfill`, never an
  inline migration data-move.
- Seed: capability grants + verify expectations (§4.10); no demo
  notifications seeded except via normal demo flows.
- Env rollout: VAPID + push vars added to `.env.example` and
  `deploy/env/*.example`; production values generated on the VPS
  (`bootstrapVpsSecrets.sh` pattern), build-stage throwaways stay
  build-only. Rollback: feature-flag the bell (`platform_settings`-style
  boolean is overkill — prefer deploy revert; migration is additive and
  safe to keep).

## 8. Verification gates

Per-slice (close every phase with evidence, not intent):

```bash
bun run lint && bun run typecheck && bun run test && bun run build && bun run db:generate
```

- `db:generate` emits nothing new after the Phase A migration (and nothing
  at all for frontend-only slices).
- `bun run test:db` for Phase A concurrency items.
- `bun run --cwd apps/web test:e2e` (new notification spec) + `smoke:phase6`
  before claiming browser acceptance; evidence screenshots in
  `docs/evidence/` (no CIN/address/secret values in artifacts).
- Plan-result checklist (separate boundaries — do not conflate):
  implementation → package publication (if a new dep is added) → Git
  publication → deployment → browser acceptance. Each cites its real
  command output.

## 9. Confirmed decisions

- Channels: in-app + email + push (matrix in §3.4 prevents triple-spam).
- Freshness: 30s polling on `unread-count`; no WS/SSE/push-as-realtime in v1
  (push is a delivery channel, not the freshness mechanism).
- Triggers: all durable outbox topics (§2 inventory) fan out in-app rows.
- Retention: read/unread only; `read_at` write-once; no delete, no
  per-type preferences in v1.
- Admin reads own inbox only (no cross-user inbox reads).
- Recipient sets exclude operator/admin broadcast (v1); operators keep
  their list pages.
- Inbox starts at deploy; no historical backfill in v1.
- Families are never emailed in v1 (no-mailbox + low-literacy population):
  in-app + push only, silent skip on missing email; copy is short,
  amount-first, icon + color + text redundantly coded, `ar` default.
- Post-v1 candidate for family reach: WhatsApp/SMS via a provider (phone
  numbers already collected, highest penetration in this population) —
  needs provider choice, consent handling, and per-message cost review;
  explicitly not in v1 scope.
