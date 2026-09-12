# Najm app integration DX — Phase 0 ledger (Freeze contracts and baselines)

- Plan: `NAJM-APP-INTEGRATION-DX-PLAN.md` (untracked root file, plan date 2026-09-12, status PLANNED).
- Ledger date: **2026-09-12**. Canonical path:
  `docs/evidence/najm-app-integration-dx/2026-09-12/README.md`.
- Scope of this task: **Phase 0 only**. No Phase 1 production code, no publish,
  push, deployment, real provider call, or database mutation.
- This ledger is the **only intended repository change** of this task and was
  produced for orchestrator review.
- Revision: corrected and completed per orchestrator review on 2026-09-12
  (provenance correction, delegation stamp in §2.5, eight approved contract
  decisions in §6.2). No production source touched by the revision.

Reading preflight (all completed before acting):

- Entire `NAJM-APP-INTEGRATION-DX-PLAN.md` (701 lines).
- `C:\Users\hdevlop\Desktop\kafil\AGENTS.md`; `C:\Users\hdevlop\Desktop\najm\AGENTS.md`;
  `C:\Users\hdevlop\Desktop\school\AGENTS.md` (which routes Najm/backend/live-data
  work to `.claude/skills/najm/SKILL.md` — read in full).
- Kafil skills: `.agents/skills/kafil-najm-frontend/SKILL.md`,
  `.agents/skills/kafil-najm-backend/SKILL.md`,
  `.agents/skills/kafil-playwright-testing/SKILL.md`.
- Najm Kit package instructions: `packages/najm-kit/AGENTS.md` (Najm repo).
- Installed Next.js 16 docs from Kafil's tree
  `apps/web/node_modules/next/dist/docs` (425 files): `proxy.md` (proxy/matcher),
  `content-security-policy.md` (nonce/CSP), `instrumentation-client.md`,
  `use-client.md` (client/server boundary), `cookies.md` + `headers.md`.
- School app-local docs tree `apps/dashboard/node_modules/next/dist/docs` is
  **absent** (no `apps/dashboard/node_modules` at all — School hoists to root
  `node_modules`). School's runnable Next docs tree is the root
  `node_modules/next/dist/docs` (`01-app`, `02-pages`, `03-architecture`,
  `04-community`, `index.md`); both resolve Next 16.2.12 (see §2).
- Installed declarations inspected directly (`node_modules/*/package.json`
  exports, `dist/*.d.ts` where cited); no proposed API was trusted without a
  manifest/declaration check.

Privacy: this ledger reports names/presence only. No `.env` values, cookies,
tokens, addresses, coordinates, or provider keys are recorded.

---

## 1. Repository baselines (branch, HEAD, dirty status)

Recorded 2026-09-12. Pre-existing user changes are distinguished from
orchestrator-owned delegation files and from this task's ledger change below.
No production source was modified by this task.

### 1.1 Kafil — `C:\Users\hdevlop\Desktop\kafil`

- Branch: `main`, upstream `origin/main`, HEAD == upstream:
  `fc7cb209030b0f18e61eda8a74fa2e504d86dbdb`
  (`fix(docker): copy Bun dependency patches before install`).
- `git status --short --branch`:
  - `## main...origin/main`
  - `M docs/plans/README.md` (pre-existing user change: adds the 4-line
    `NAJM-APP-INTEGRATION-DX-PLAN.md` index entry; diff inspected, not modified
    by this task).
  - `?? NAJM-APP-INTEGRATION-DX-PLAN.md` (the active plan itself, pre-existing
    user file, not modified by this task).
  - `?? .opencode/` → contained the orchestrator-owned temporary delegation
    briefs during the run. These were not pre-existing user changes and were
    removed after review.
  - `?? docs/evidence/najm-app-integration-dx/` → this task's ledger (the only
    task-owned repository change; see §8).
- `git diff --stat`: 1 file, 4 insertions (`docs/plans/README.md`).
- Stash list: no stash command was run by this task; stash entries, if any,
  were not inspected further.
- Preservation claim: the scoped `git status`/`git diff` output for the
  pre-existing entries remained unchanged before vs after this task (see §8).
  No before/after content hashes were taken, so no stronger claim is made.

### 1.2 Najm — `C:\Users\hdevlop\Desktop\najm`

- Branch: `master`, upstream `origin/master`, HEAD == upstream:
  `6a3968147fd5bd793a8157e136b6ac41da760215`
  (`chore(najm-kit): release 2.13.1`).
- `git status --porcelain=v1`: **clean** (no modified, no untracked output).
- Stash list (recorded read-only for completeness, not modified — no stash
  command was run by this task):
  - `stash@{0}`: `On feat/trusted-proxy-rate-limit-hardening: wip: najm-auth
    github oauth (parked for najm-kit 2.11.16 release)`
  - `stash@{1}`: `On master: backup before syncing Najm master after 0.2 release`
- This task made **zero** changes in Najm (per instruction: do not edit Najm).

### 1.3 School — `C:\Users\hdevlop\Desktop\school`

- Branch: `feat/trusted-proxy-rate-limit-hardening`, upstream
  `origin/feat/trusted-proxy-rate-limit-hardening`, HEAD == upstream:
  `ca93b4f765b096fb0e7f18973bd7e03a50b38553`
  (`fix(ui): consume resolved sidebar footer state`).
- `git status --porcelain=v1`: **29 modified + 30 untracked** (all pre-existing
  user work, not modified by this task). Modified (tracked):
  `SCHOOL-CONNECTED-ACCEPTANCE-PLAN.md`,
  `apps/dashboard/.env.local.example`, `apps/dashboard/package.json`,
  `apps/dashboard/src/app/layout.tsx`, `apps/dashboard/src/app/providers.tsx`,
  `apps/dashboard/src/app/sw.js/route.ts`,
  `apps/dashboard/src/features/Settings/components/sections/NotificationSection.tsx`,
  `apps/dashboard/src/lib/session.test.ts`,
  `apps/dashboard/src/lib/themeAdoption.test.ts`, `apps/dashboard/src/proxy.ts`,
  `apps/dashboard/src/shared/DashboardShell/index.tsx`,
  `apps/dashboard/src/shared/PageHeaderGlobalActions.tsx`, `bun.lock`,
  `compose.production.yml`, `deploy/env/app.env.example`, `package.json`,
  `packages/seed/package.json`, `packages/server/package.json`,
  `packages/server/src/database/migrations/meta/_journal.json`,
  `packages/server/src/database/schema/index.ts`,
  `packages/server/src/locales/{ar,en,es,fr}.json`,
  `packages/server/src/modules/financial/notifications/NotificationService.ts`,
  `packages/server/src/modules/index.ts`, `packages/server/src/najm.ts`,
  `packages/server/tests/financial/NotificationService.test.ts`,
  `packages/server/tests/staff/StaffSeedSchema.test.ts`.
  Untracked (names only): `apps/dashboard/src/app/(dashboard)/notifications/page.tsx`,
  `apps/dashboard/src/app/(dashboard)/preferences/page.tsx`,
  `apps/dashboard/src/app/api/csp-report/route.ts`,
  `apps/dashboard/src/features/Notifications/` (7 files),
  `apps/dashboard/src/lib/authSecurityAdoption.test.ts`,
  `apps/dashboard/src/lib/contentSecurityPolicy.ts`,
  `apps/dashboard/src/lib/cspPolicy.test.ts`,
  `apps/dashboard/src/lib/cspReports.ts`,
  `packages/server/src/database/migrations/0046_elite_leader.sql`,
  `packages/server/src/database/migrations/meta/0046_snapshot.json`,
  `packages/server/src/modules/notifications/` (9 files),
  `packages/server/src/workers/notificationsDispatch.ts`,
  `packages/server/src/workers/notificationsWorker.ts`,
  `packages/server/tests/notifications/NotificationSystem.test.ts`.
- `git diff --stat`: 29 files, 428 insertions, 847 deletions. Migration 0046
  (`0046_elite_leader`, journal idx 46) and all dirty work not modified by this
  task; the scoped `git status`/`git diff --stat` output remained unchanged
  before vs after (see §8; no content hashes taken).
- Stash list: empty at baseline; no stash command was run by this task. This
  task made **zero** changes in School.

### Baseline vs plan §3 preflight

- Plan states "Kafil and Najm were clean at planning preflight." Current state:
  Najm is still clean; Kafil carries the two pre-existing user entries noted
  above (`docs/plans/README.md` modification + untracked plan). The
  `.opencode/` files were temporary orchestrator delegation plumbing, not user
  work, and were removed after review. School's extensive dirty snapshot persists as the
  plan warned; it is treated as a working-tree snapshot, not a release.

---

## 2. Installed resolutions, patches, scripts/gates, execution context

### 2.1 Installed versions (from installed `package.json`, not manifests)

| Dependency | Kafil resolved (`apps/web/node_modules`) | School resolved (root `node_modules`) | Najm source (`packages/*/package.json:version`) |
| --- | --- | --- | --- |
| Next.js | 16.2.12 | 16.2.12 | dev 16.2.11 (packages), peer `>=15.3.0 <17` (`najm-next`), `>=14` (`najm-kit`/`najm-auth`/`najm-theme`) |
| `najm-auth` | 4.0.2 | 4.0.2 | 4.0.1 (source behind published/installed 4.0.2 — release drift, see below) |
| `najm-theme` | 0.2.1 | 0.2.1 | 0.2.1 |
| `najm-kit` | 2.13.1 | 2.11.19 | 2.13.1 |
| `najm-next` | 0.4.0 | 0.3.0 | 0.4.0 |
| `najm-core` (pin) | 2.0.6 (root overrides) | 2.0.6 (root deps+overrides) | workspace |
| Bun | 1.3.14 (`bun --version`; Kafil `packageManager`) | 1.3.14 (same toolchain binary) | `bun@1.2.10` (Najm `packageManager`) |

Plan Table §3 matches installed resolutions exactly (Next 16.2.12, auth 4.0.2,
theme 0.2.1, kit 2.13.1/2.11.19, next 0.4.0/0.3.0). Two staleness notes:

- Kafil `AGENTS.md` §Platform-theming still says `najm-theme@0.2.0`; installed is
  **0.2.1** everywhere. Manifests/declarations win; AGENTS.md text is stale.
- Najm checkout source `packages/najm-auth/package.json:3` reads **4.0.1** while
  both apps install published **4.0.2** (and Kafil patches `najm-auth@4.0.2`
  dist). Do not read Najm `HEAD` auth source as the 4.0.2 contract.

### 2.2 Capability gaps that follow from the version table (verified in exports)

- School `najm-kit@2.11.19` exports (installed): `.`, `./theme.css`, `./next`,
  `./app`, `./server`, `./server/react`, `./query`, `./format`, `./pagination`,
  `./json`, `./person-images` — **no `./location/*` subpaths**.
  Kafil/Najm `najm-kit@2.13.1` additionally exports `./location`,
  `./location/runtime`, `./location/runtime/leaflet`, `./location/leaflet`,
  `./location/google`. School therefore cannot consume the shared location
  runtime/controls before FIX-08 (registry upgrade to a 2.13.x line).
- School `najm-next@0.3.0` exports: `.`, `./config`, `./configurable`, `./pwa`,
  `./pwa/react` — **no `./location/server`**. Kafil/Najm `najm-next@0.4.0`
  additionally exports `./location/server` (`defineNajmLocationRuntime`).
  Same FIX-08 consequence for CSP/location runtime sharing.
- Proposed `najm-next/{app,app/server,app/react,security,security/reports,
  instrumentation/client,location/server(google)}` subpaths exist **neither**
  in installed 0.4.0 **nor** in Najm source (`packages/najm-next/src` holds only
  `index.ts`, `config.ts`, `configurable.ts`, `pwa.ts`, `pwaReact.ts`,
  `location/server.ts`, `internal/*`). They are free names for Phase 1 — no
  collision, no silent overwrite.

### 2.3 Patches (Kafil `patches/`, applied via `patchedDependencies`)

- `patches/najm-auth@4.0.2.patch` (3.5 KiB): adds optional inline
  `accountInviteLogo { alt?, contentBase64, contentType, filename }` to
  `AuthConfig`/`AuthPluginConfig` and threads it through the account-invitation
  email path (`dist/index.d.ts` + `dist/index.js` hunks). Relevant to Phase 5
  (audit before changing the affected package version) and to branding-logo
  evidence (do not conflate with `najm-theme` branding slots).
- `patches/najm-email@2.0.4.patch` (3.0 KiB): extends the resend provider
  attachment mapping (`logoSrc`/`logoAlt` template params;
  `content_disposition`, `content_id` passthrough in `dist/index.mjs`).
- No `apps/web/patches/` directory. School has no `patchedDependencies` block;
  its upgrade path is exact published pins (per School AGENTS.md).

### 2.4 Actual package scripts/gates (verbatim, execution-time truth)

Kafil root (`package.json:33-64`): `dev`, `dev:https`, `preview:https`, `build`
(apps/web build under `--env-file=.env`), `start`, `lint` (web+server+seed),
`typecheck` (web+server+seed), `test` (web+server+seed), `check`
(=lint+typecheck+test+build), `test:rate-proxy-acceptance`, `test:db`
(`KAFIL_RUN_DB_INTEGRATION=1`), `db:generate/migrate/studio`, seed family
(`seed`, `seed:full/remove/demo/images`, `seed:migrate/admin/reconcile-auth/
products/themes/verify`), `images:backfill`, `theme:backfill`,
`contributions:expire`, `notifications:worker/dispatch`, `setup`.
`apps/web` scripts: `dev: next dev`, `build: bun --env-file=../../.env next
build`, `start: next start`, `lint: eslint .`,
`typecheck: bun --bun next typegen && tsc --noEmit`, `test: bun test`,
`test:e2e*`, `smoke:phase6`. `packages/server` test compiles first
(`tsc -p tsconfig.test.json && bun test --preload ./dist/test/setup.js
./dist/test`); `dist/` is a build artifact. Plan §10.2 commands confirmed
present.

School root (`package.json:9-48`): `dev`, `start`, `build` (dashboard
`scripts/next-build.mjs`), `build:server/seed/all`, `lint`
(`--filter @sms/dashboard`), `test:seed` (fakers), `test:server`
(`packages/server/tests`), `test:dashboard` (`apps/dashboard/src`),
`test:e2e:najm-upgrade`, `test:e2e:acceptance`, `db:generate/migrate/push/
push:force/drop/check` (all `bun --env-file=apps/dashboard/.env.local
drizzle-kit ...`), `notifications:worker/dispatch`, seed family
(`seed:admin/roles/staff/school/demo/expenses/topup`, `gen:demo`,
`reset:demo`, `seed:full`, `seed`), `validate*`, `i18n:check`
(`python scripts/check_i18n_keys.py`), `gen*`. There is **no root `typecheck`
script** (plan §10.3 note confirmed); `apps/dashboard` scripts: `dev: next dev
--turbo -p 3102`, `build: node ./scripts/next-build.mjs`,
`start: next start -p 3102`, `lint: eslint src`, `https: next dev
--experimental-https -p 3102`, plus the two e2e runners. Env is
`apps/dashboard/.env.local` (template `.env.local.example`); School does not
use Kafil's root loader.

Najm root (relevant to plan §10.1, verbatim): `build:ui` /
`lint:ui` / `test:ui` (kit), `test:auth` (+ `test:auth:next16`),
`test:next`, `build:next`, `build:theme` / `lint:theme` / `test:theme`,
per-package `test:next16` (kit/auth/theme), `api:check` / `api:snapshot`
(`scripts/check-public-api.mjs`), `publish:all(:dry)`, `publish:pkg(:dry)`,
`pub:ui/theme/next/auth/cli/...`. There is **no root `test:next16`**; the
per-package form is the real gate. Release forms per plan §10.1
(`scripts/publish-package.ts <package> --pack-only | --publish-tarball
<exact-path> | --verify-published <version>`) exist in source; not executed.

### 2.5 Delegation stamp (orchestrator-supplied execution metadata)

- OpenCode CLI: **1.18.30**. Model: **`opencode/muse-spark-1.3-contributor-free`**,
  variant **`xhigh`**. Phase 0 session: **`ses_f68edaf04ffe795fYCCa4Nz3fl`**.
  Relay-reported cost: **$0**.
- This stamp describes the execution harness, not the repositories; it is not
  a repository contract and carries no version/pin implication for Najm, Next,
  or either app.
- Toolchain observed directly: `bun 1.3.14` (ran the focused tests in §5);
  `git` baselines in §1; installed package identities in §2.1.

---

## 3. Wiring traces (concrete files/symbols)

### 3.1 Auth / session

| Concern | Kafil | School |
| --- | --- | --- |
| Definition | `apps/web/src/lib/auth.ts:3` `export const auth = defineAuth({...})` from `najm-auth/client/server`. `apiBaseURL /api`, `authPrefix /auth`, 7 public + 12 protected routes, `roleRoutes` for `/operator*`, `/family*`, `/children`, `/sponsor*`, `/products`, `/categories`, `/orders`, `/contribution*`, `/applicants`, `/notifications`; `refreshThreshold 0.8`, `tabSync true`, **`proxySessionMode: "optimistic"`** (`:53`, with ownership comment) | `apps/dashboard/src/lib/auth.ts:3` `export const auth = defineAuth({...})`. `apiBaseURL /api`, `authPrefix /auth`, `refreshThreshold 0.8`, `tabSync true`, `loginRoute /login`, `forbiddenRoute /`; public `[/login,/register,/forgot-password,/reset-password,/change-password,/manifest.webmanifest]`, protected `[/,/:path*]`; **`proxySessionMode: "authoritative"`** (`:17`) |
| Singleton accessor | `apps/web/src/lib/session.ts:6-7`: `import "server-only"`, `createReactServerAuth(auth)` from `najm-auth/client/server/react`, `export const serverAuth` + `{getSession,requireSession,requireRole}`. Single call site repo-wide | `apps/dashboard/src/lib/session.ts:18`: identical shape (`server-only` + `createReactServerAuth(auth)`), module-scope factory, single call site; comment forbids per-request construction |
| Catch-all API | `apps/web/src/app/api/[...route]/route.ts:10-19`: `handle(server)` from `najm-core` over `@kafil/server`; `auth.routeHandlers(serverHandler, {rememberCookieName:"kafil.remember"})`; exports `GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS`; `runtime nodejs`, `force-dynamic` | `apps/dashboard/src/app/api/[[...route]]/route.ts:6-14`: `handle(server)` via `@sms/server/najm`; `auth.routeHandlers(serverHandler, {rememberCookieName:"sms.remember"})`; exports `GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS`. Optional catch-all shape preserved |
| Proxy | `apps/web/src/proxy.ts:4-16`: `createCspNonce()` → `createContentSecurityPolicy(nonce)` → `auth.proxy(req, {requestHeaders: {content-security-policy, x-nonce}})` → set `Content-Security-Policy` on response. Matcher excludes `api`, `_next/*`, favicon, asset extensions (`:18-21`). No prefetch bypass | `apps/dashboard/src/proxy.ts:24-45` (modified, tracked): `hasRefreshToken` (refreshToken cookie regex `:10`) + `isSpeculativePrefetch` (router-prefetch/purpose/sec-purpose/state-tree `:12-22`); **bypass branch** `if (hasRefreshToken && isSpeculativePrefetch) return NextResponse.next()` (`:25-27`, FIX-04) before the same nonce/policy/`auth.proxy` composition. Matcher additionally excludes `images`, `storage` |
| Login | `apps/web/src/app/(auth)/login/page.tsx:16` `await connection()` (opts out of static gen); `LoginForm` (`features/Auth/components/LoginForm.tsx:28`): `auth.client.login(values)` (`:47`), `getPostLoginRoute` (`credential_setup→/change-password`); OAuth buttons from `najm-auth/client/react`; schemas `features/Auth/config/authSchemas.ts:11` | Standard auth layouts: `apps/dashboard/src/app/(auth)/layout.tsx:9` `serverAuth.getSession()` + redirect `/` when signed in; `(dashboard)/layout.tsx:13` `serverAuth.requireSession()` + `force-dynamic`; `settings/layout.tsx:20` `serverAuth.requireRole(['admin','principal'])` |
| HTTP client | `apps/web/src/services/http.ts:88-224`: client-only (`"use client"`), bearer via `auth.client` state, `ensureAccessToken` skips `/auth/*` + applicant verification paths, single-flight `refresh()`, 401→one retry; `api{get,getPage,post,put,patch,delete,upload,deleteFile}`; `authorizationHeaders` for theme transport; errors via `services/apiError.ts` (`KafilApiError`) | `apps/dashboard/src/services/http.ts` + `formDataHelper.ts` (ground-truth per School AGENTS.md); preference-cookie logout cleanup via `clearSchoolUiPreferences` (below) |
| Session-mode consumers | Root layout `apps/web/src/app/layout.tsx:48` `getSession().catch(()=>null)` (anonymous fallback); dashboard layout `requireSession()` | Root layout `apps/dashboard/src/app/layout.tsx:44` `serverAuth.getSession()` **propagates** failures (no catch) — the FIX-05 layout asymmetry |

Owning package (both): `najm-auth` — `defineAuth` (`client/server/defineAuth.ts:197`),
`withAuthMiddleware` (`:106`, `AuthProxyOptions{requestHeaders?}`),
`withAuthCookiePersistence` (`authCookiePersistence.ts:197`),
`createReactServerAuth` (`client/server/react.ts:92`, structural
`ReactServerAuthSource`, cross-bundle `Symbol.for('najm-auth.reactServerInternals')`),
`ProxySessionMode = 'optimistic'|'authoritative'`
(`withAuthMiddleware.ts:19`; default optimistic; API/server authorization stays
authoritative either way).

### 3.2 CSP / report handling

| Concern | Kafil (tracked) | School (3 files **untracked** `??`, rest tracked) |
| --- | --- | --- |
| Nonce + policy | `apps/web/src/lib/contentSecurityPolicy.ts:7` `createCspNonce()` (`btoa(crypto.randomUUID())`); `:11` `createContentSecurityPolicy(nonce, isDevelopment, location=kafilLocation.resolve(...))`; nonce-pattern throw; `script-src 'self' nonce strict-dynamic [+ 'unsafe-eval' dev]`; `img-src` = self/data/blob/cdnjs/OSM + `location.csp.imgSrc` deduped; `connect-src` = self + `location.csp.connectSrc`; `frame-src 'none'`; `report-uri /api/csp-report` | `apps/dashboard/src/lib/contentSecurityPolicy.ts:3` (untracked) same nonce shape; `:7` policy with **Google allowlist**: `connect-src *.googleapis.com *.google.com`, `font-src *.gstatic.com`, `frame-src self https://www.google.com`, `img-src *.googleapis.com *.gstatic.com`; dev `unsafe-eval`; `report-uri /api/csp-report` |
| Sanitizer + bounded reader | `apps/web/src/lib/cspReports.ts:20` `SanitizedCspReport{documentUri,violatedDirective,effectiveDirective,blockedUri,disposition,statusCode}`; `MAX_BODY_BYTES 8192`; `content-length` short-circuit + streamed `reader.read()+cancel()`; `sanitizeUri` keeps origin+pathname; `sanitizeCspReports` handles `csp-report` + `reports+json` batch | `apps/dashboard/src/lib/cspReports.ts:4` (untracked) same contract, `MAX_BODY_BYTES 8192`, `MAX_FIELD_LENGTH 256`. Current-source note: both sanitizers still retain some relative fragments/data + path content — the **decided** origins/keywords-only rule (§4.2, §6.2-D6) hardens this in Phase 1 |
| Route | `apps/web/src/app/api/csp-report/route.ts:17` `POST`: `readBoundedJson` → `console.warn("[csp] violation", report)` → always `204` (good/malformed/oversized identical); `nodejs`, `force-dynamic` | `apps/dashboard/src/app/api/csp-report/route.ts:6` (untracked) identical 204-always shape |
| Client init | `apps/web/src/instrumentation-client.ts:1-9`: Zod JIT-less pre-hydration only (`__zod_globalConfig.jitless=true`), no imports; pinned by `apps/web/test/csp-policy.test.ts:106-118` | `apps/dashboard/src/app/layout.tsx:66-68`: inline `<Script id="zod-strict-csp" nonce strategy="beforeInteractive">{jitless=true}</Script>` (FIX-03 divergence: inline script vs shared init) |

Next-docs basis (installed tree): nonce-per-request + dynamic rendering
(`content-security-policy.md:24-42`); proxy-before-render with headers/cookies
pass-through (`proxy.md:11-23`); matcher negative patterns (`proxy.md:73-75`);
`instrumentation-client.ts` root placement, no required exports
(`instrumentation-client.md:6-12`).

### 3.3 Settings / preferences / theme / providers

Kafil:

- `apps/web/src/lib/serverSettings.ts:14` `loadFormFillSetting(): Promise<FormFillSetting>`
  (dynamic `import("@kafil/server/settings-bootstrap").readFormFillEnabled()`,
  catch→`console.warn` raw value + `{enabled:false}` — FIX-06).
- `apps/web/src/lib/preferences.ts:12` `kafilPreferences = defineNajmPreferences({
  i18n: kafilI18n, defaultTimeZone: "Africa/Casablanca",
  cookieNames: { language: "kafil-ui-language", theme: "kafil-ui-theme",
  timeZone: "kafil-ui-timezone" } })`; `resolve` consumed in `layout.tsx:59`
  with `{languageFallback: session?.user.language, acceptLanguage}`;
  `handlers.language/theme/timeZone` exported as the three `ui-*` POST routes
  (POST-only; no DELETE).
- `apps/web/src/lib/serverTheme.ts:5` `kafilTheme.react({getServer, basePath:"/api"})`
  (`@kafil/server/theme` bare specifier); `loadServerAppearance/Branding`.
- `apps/web/src/app/layout.tsx:42-90`: `Promise.all([session?, cookies(),
  headers(), appearance, branding, formFill])` → `kafilLocation.resolve(...)` →
  `kafilPreferences.resolve(...)` → `<html dir lang data-time-zone>` →
  `<AppProviders initialBranding initialDesign appearance.designConfig
  initialFormFill initialLanguage locationConfig initialSession initialTheme
  initialTimeZone>` + `NajmClientRoot` + `NajmPwaRegistration` (`najm-next/pwa/react`).
- `apps/web/src/providers/AppProviders.tsx:142-144`: `AuthProvider{client,
  initialSession}` → `QueryProvider` → `NajmProviders` =
  `NajmAppProvider{i18n: kafilUiI18n, appName, badgeDefaults, currency
  KAFIL_CURRENCY, formDevTools: <live F8 query>, initialBranding/Design/Language/
  Theme/TimeZone}` → `NThemeBrandingProvider{branding}` →
  `KafilLocationProvider{config}` (`NLeafletLocationRuntimeProvider`,
  `geocoder={null}`, 23 `t("operator.families.*")` labels, no-geocoder policy).
- `QueryProvider.tsx:8-31`: queries `staleTime 60s, gcTime 600s,
  refetchOnWindowFocus false, retry once iff status undefined or ≥500`;
  mutations `retry false`. F8 subscription keeps `refetchOnWindowFocus true`.

School:

- `apps/dashboard/src/lib/serverSettings.ts:26` `loadSchoolSettings =
  cache(loadSchoolUiSettings)` (null on miss/error + sanitized warn).
  Server projection `packages/server/src/uiSettings.ts:14`
  `SchoolUiSettings{schoolName, language, theme, timeZone, currency}` (latest row).
- `apps/dashboard/src/lib/serverPreferences.ts:63-110`
  `resolveSchoolPreferences(session)`: per-field first-valid-wins —
  language/theme/timeZone: **cookie → user → school setting → typed fallback**;
  currency: **school setting only → fallback** (never cookie/user/locale).
  Defaults: language `en`, theme `light`, timeZone `Africa/Casablanca`,
  currency `MAD`; `direction`/`locale` derived per language.
- `apps/dashboard/src/preferences/index.ts`: 12-currency + 12-timezone
  allowlists, `isSchool*/normalizeSchool*` guards, `schoolFormattingLocale`,
  `schoolTextDirection`.
- `apps/dashboard/src/preferences/cookies.ts:11` `SCHOOL_UI_COOKIES =
  {language: "school-ui-language", theme: "school-ui-theme",
  timeZone: "school-ui-timezone"}`; `httpOnly, maxAge 1y, path /, sameSite lax`;
  endpoints `/api/ui-language|theme|timezone`. `clearUiPreferences.ts:15`
  `Promise.allSettled(DELETE × 3)`; wired into sign-out
  (`DashboardShell/index.tsx:209-216`) without blocking auth logout.
- `ui-*` routes support **POST + DELETE** with per-field guards
  (`Unsupported language/color theme/time zone` 400s); language route documents
  the DB writer (`PUT /users/language` via `useUpdateLang`) as separate.
- `apps/dashboard/src/lib/serverTheme.ts:5` `schoolTheme.react({getServer,
  basePath:"/api"})` (`@sms/server/theme`).
- `apps/dashboard/src/app/layout.tsx:35-76`: Lora + Roboto Mono fonts;
  `Promise.all([serverAuth.getSession(), headers()])` (nonce via `x-nonce`);
  `Promise.all([resolveSchoolPreferences, appearance, branding])`;
  `<html data-time-zone dir lang>` + inline Zod script (FIX-03) +
  `<AppProviders initialBranding initialDesign initialSession preferences>`.
- `apps/dashboard/src/app/providers.tsx:60-98`: `AuthProvider` →
  `QueryProvider` (queries **and** mutations `retry: 0`) →
  **`KeyboardProvider`** (inside Query, outside UI) → `NajmAppProvider{
  appName, badgeDefaults, currency: preferences.currency,
  endpoints: {theme, timeZone}, initialBranding{sidebarLogo*Path},
  i18n: schoolI18n, initialDesign/Language/Theme/TimeZone,
  languageEndpoint, normalizeTimeZone, formDevTools: devFillFlag}` →
  `NThemeBrandingProvider`.
- One-provider/one-source/singleton rules hold in both apps today (single
  `NajmAppProvider`, single `createReactServerAuth`, single Next config line
  `export {default} from "najm-next/config"`).

Owning packages: `najm-kit/server` (`defineNajmPreferences`,
`NajmPreferences{cookieNames, cookieOptions, timeZones, defaultTimeZone,
defaultTheme, resolve, handlers{language,theme,timeZone}}`; current handlers are
POST-only — POST+DELETE co-ownership in `najm-kit/server` is the **decided**
contract, §4.5/§6.2-D7, implemented in Phase 2);
`najm-kit/server/react` (`createReactServerUiBootstrap`, `cache()`-memoized,
RSC-only + browser guard); `najm-kit/app` (`NajmAppProvider`, deliberately
excludes Auth/Query); `najm-theme` (`defineTheme`, `theme()` plugin,
`buildThemeBootstrap` with independent appearance/branding fallbacks,
`NThemeBrandingProvider`, `NThemeImage`).

### 3.4 School location — exhaustive consumer + DTO/service map

Runtime today: **no shared runtime**. Google Maps via `@react-google-maps/api
^2.20.8` (dashboard dep); `leaflet ^1.9.4` + `react-leaflet ^5.0.0` installed
but **zero imports** in `apps/dashboard/src`. Key var (template only, commented):
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`apps/dashboard/.env.local.example:166-167`).

- `components/location/types.ts:1` `LocationValue{address, placeId?,
  latitude?, longitude?}`; `:8` `CASABLANCA_CENTER {33.5731,-7.5898}`.
- `components/location/LocationPickerDialog.tsx:24` default export; `libraries
  ['places']`; `useJsApiLoader{id 'student-transport-google-maps', language,
  region 'MA', version 'beta'}`; `resolvePoint` via `google.maps.Geocoder`
  (place_id→placeId, formatted_address→address); `PlaceAutocompleteElement`
  (`country 'ma'`, bias Casablanca, `requestedLanguage/Region`);
  `place.fetchFields(['id','formattedAddress','location'])`; unavailable +
  cancel path when key missing/load fails; save disabled unless
  address + lat + lng (+ resolving guard).
- `components/location/LocationField.tsx:29` `LocationField({form, names,
  label, placeholder, required, rows, compact})` (`ssr:false` dialog import);
  `names{address, placeId, latitude, longitude}`; map pick sets all four;
  current source: **manual address edit clears placeId/lat/lng to null**
  (`:72-76`). Against the decided address-edit contract (§4.6, §6.2-D5) the
  lat/lng clearing differs — recorded as a Phase 3 parity-test requirement
  (see §5), not a Phase 0 API question.
- Field consumers (all `LocationField`, grep-exhaustive):
  `features/Transport/components/VehicleStudentsPanel.tsx:60-69` (pickup +
  dropoff twins, optional `max(500)` + ±90/±180, prefill from
  `student.address*`); `TransportAssignmentForm.tsx:70-84` (pickup required,
  dropoff optional); `StudentTransportFormContent.tsx:137-165` (watches
  `address/addressPlaceId/addressLatitude/addressLongitude`,
  `useHomeAddress()` student→pickup copy, dropoff defaults from
  `publicSettings.schoolAddress*`, date from `enrollmentDate||businessDate`);
  `features/Settings/components/sections/SchoolSection.tsx:33-44`
  (`schoolAddress*`); `features/Students/components/SimpleStudentForm.tsx:200-212`
  (`address*`, `rows 4`); `SettingsForm.tsx:95-98` defaults.
- `placeId|place_id` grep-exhaustive: shared `packages/server/src/shared/
  locationDto.ts:5,9` (`latitudeDto/longitudeDto/placeIdDto/locationDto`);
  settings (`settingSchema.ts:13`, `SettingsDto.ts:9`,
  `SettingsService.ts:43-46,112-116`, `SettingsRepository.ts:10-13`);
  student home (`studentSchema.ts:20`, `StudentDto.ts:13,19,23,38`,
  `StudentService.ts:95-98,111-117,127-129`, `StudentRepository.ts:16-19`);
  route assignment (`studentRouteSchema.ts:19,23`, `StudentRouteDto.ts:3,13,17`,
  `StudentRouteService.ts:45-52,63-66,74-80`,
  `StudentRouteRepository.ts:20-27`); migrations `0038_student_transport_locations`
  through `0046` snapshots. Validators: `StudentRouteValidator.ts:25-31,56-57`
  (coordinate-pair checks); `SettingsValidator.ts:39-53` (language/theme only).
- `google|maps` grep-exhaustive (dashboard `src`): CSP allowlist, `cspPolicy`
  test, `next/font/google` (unrelated), `LocationPickerDialog` (only SDK user),
  lucide `MapPin/MapPinned` display icons only.
- Kafil location (for parity): `defineNajmLocationRuntime` (`najm-next/location/
  server`, prefix `KAFIL_LOCATION`, Leaflet-only); form value
  `{address, latitude, longitude}` with **no placeId**
  (`familySchemas.ts:74-92`, pair superRefine); backend `exact_address` +
  `delivery_latitude/longitude` + pair CHECK; standalone delivery `DeliveryMap`
  reads `NEXT_PUBLIC_MAP_TILE_URL ?? OSM` (not the shared runtime).

---

## 4. Frozen contracts (names + TypeScript sketches + boundaries)

Status: **approved Phase 0 contract** — names verified free (§2.2), shapes
derived from current declarations, decisions D1–D8 approved by the orchestrator
(§6.2) on 2026-09-12. This section is the implementation basis for Phases 1–3.

### 4.1 Shared-safe app config — `najm-next/app` (pure, no React)

```ts
// najm-next/app — imports NOTHING: no secrets, env object, cookies, backend,
// fs, or React request state. Serializable; safe to import from proxy/routes.
import type { ProxySessionMode } from "najm-auth/client/server";

export interface NajmAppRoutePolicy {
  publicRoutes: readonly string[];
  protectedRoutes: readonly string[];
  roleRoutes?: Readonly<Record<string, readonly string[]>>;
  loginRoute: string; forbiddenRoute: string;
}
export interface NajmAppDefinition {
  readonly id: string;                       // "kafil" | "school"
  readonly auth: NajmAppRoutePolicy & {
    readonly apiBaseURL: string; readonly authPrefix: string;
    readonly proxySessionMode: ProxySessionMode;
    readonly rememberCookieName: string;     // "kafil.remember" | "sms.remember"
    readonly refreshThreshold?: number; readonly tabSync?: boolean;
  };
  readonly preferences: {
    readonly cookieNames: { readonly language: string; readonly theme: string; readonly timeZone: string };
    readonly defaultTimeZone: string;        // "Africa/Casablanca" both apps
  };
  readonly csp: {
    readonly reportPath: "/api/csp-report";
    readonly extraImgSrc?: readonly string[]; readonly extraConnectSrc?: readonly string[];
    readonly frameSrc: readonly string[];    // Kafil ['none'] vs School Google set
  };
  readonly location: { readonly environmentPrefix: string }; // KAFIL_LOCATION | SCHOOL_LOCATION
}
export declare function defineNajmApp(def: NajmAppDefinition): NajmAppDefinition;
```

Kafil instance: optimistic + explicit roleRoutes + OSM img extras.
School instance: authoritative + `/` + `/:path*` protected + Google CSP extras.

### 4.2 Security / report composition — `najm-next/security`, `najm-next/security/reports`

```ts
// najm-next/security — may import najm-auth client/server + location/server types.
// MUST NOT initialize theme, database, or RSC bootstrap (proxy isolation).
export interface NajmCspOverrides {
  readonly extraScriptSrc?: readonly string[]; readonly extraImgSrc?: readonly string[];
  readonly extraConnectSrc?: readonly string[]; readonly extraFrameSrc?: readonly string[];
}
export declare function createNajmCsp(nonce: string, opts: {
  readonly isDevelopment: boolean; readonly app: NajmAppDefinition;
  readonly locationCsp: { readonly imgSrc: readonly string[]; readonly connectSrc: readonly string[] };
  readonly overrides?: NajmCspOverrides;
}): string;
export declare function createNajmNonce(): string;   // btoa(crypto.randomUUID()), pattern-guarded
export declare function composeNajmProxy(opts: {
  readonly auth: { readonly proxy: (req: Request, init?: { requestHeaders?: Record<string,string> }) => Promise<Response> };
  readonly app: NajmAppDefinition;
  readonly resolveLocationCsp: (env: EnvRecord) => { readonly imgSrc: readonly string[]; readonly connectSrc: readonly string[] };
}): (req: Request) => Promise<Response>;             // preserves redirects/cookies incl. multi Set-Cookie
```

```ts
// najm-next/security/reports — no backend boot; sink failures never fail the 204.
export interface NajmCspReport { readonly documentUri: string; readonly violatedDirective: string;
  readonly effectiveDirective: string; readonly blockedUri: string;
  readonly disposition: string; readonly statusCode: string; }
export declare function sanitizeNajmCspReports(payload: unknown): NajmCspReport[];
export declare function readNajmBoundedJson(req: Request, limit?: 8192): Promise<unknown | null>;
export declare function createCspReportHandler(opts?: {
  readonly sink?: (r: NajmCspReport) => void;        // default: sanitized warn
}): (req: Request) => Promise<Response>;             // always 204; legacy + batch envelopes
```

Redaction rule (decided, §6.2-D6 — origins/keywords-only, **no path retention**):
strip credentials, query, and fragment from absolute **and** relative URLs;
reduce data/blob payloads to approved keywords; keep only approved keywords for
inline/eval/self/data/blob and normalized origins for absolute URLs;
relative/unparseable inputs become a generic redacted keyword. Never emit raw
JSON, samples, tokens, addresses, coordinates, or keys. Phase 1 tests must cover
credentials, query, fragment, path secrets, data/blob payloads,
malformed/oversized streams, and sink failure.

### 4.3 Server bootstrap — `najm-next/app/server` (`createNajmServerApp`)

```ts
// najm-next/app/server — imports "server-only". Backend binding is LAZY + explicit
// (never infer from cwd): getServer: () => Promise<{ server: unknown }>.
import "server-only";
export interface NajmPublicSettingsReader<T> { (): Promise<T> }
export interface NajmServerApp<TSettings, TSnapshot> {
  readonly getSession: (...) => Promise<...>;        // via najm-auth react-server accessor
  readonly requireSession: (...) => Promise<...>;
  readonly requireRole: (roles: readonly string[]) => Promise<...>;
  readonly loadSettings: () => Promise<TSettings>;   // request-memoized, per-render agreement
  readonly loadUiSnapshot: () => Promise<TSnapshot>; // session+cookies/headers+theme+settings, concurrent starts
}
export declare function createNajmServerApp<TSettings, TSnapshot>(opts: {
  readonly app: NajmAppDefinition;
  readonly auth: { readonly getSession: unknown; readonly requireSession: unknown; readonly requireRole: unknown };
  readonly theme: { readonly loadAppearance: unknown; readonly loadBranding: unknown };
  readonly readSettings: NajmPublicSettingsReader<TSettings>;   // Kafil: {enabled:boolean} | School: SchoolUiSettings
  readonly resolvePreferences: (input: { cookies: unknown; session: unknown; settings: TSettings; headers: unknown }) => TSnapshot;
  readonly onDiagnostic?: (d: { readonly code: string; readonly detail?: string }) => void;  // sanitized
}): NajmServerApp<TSettings, TSnapshot>;
```

Rules: one factory at module scope per app; independent session/theme/settings
reads start concurrently, only preference selection waits. Session error
classification is owned by Najm Auth (decided, §6.2-D4): verified
no-session/expired/invalid-session states may resolve anonymous according to
app policy; configuration, transport, backend, and unexpected failures
propagate — no blanket catch, no universal default. Per-request memoization
(Kit `cache()` semantics), never cross-request; public-settings fallback is
typed + sanitized and applies to display reads only.

### 4.4 Client provider composition — `najm-next/app/react` (`NajmNextAppProvider`)

```tsx
// najm-next/app/react — "use client". Receives ONLY the public snapshot.
"use client";
export interface NajmNextExtension { readonly beforeUi?: React.ReactNode; readonly insideUi?: React.ReactNode; }
export interface NajmNextAppProviderProps<TSnapshot> {
  readonly snapshot: TSnapshot;                      // public session projection + public UI config only
  readonly queryClient?: unknown;                    // app-created; lifetime = mounted app, never server-global
  readonly createQueryClient?: () => unknown;
  readonly extensions?: NajmNextExtension;           // Kafil: settings subscription | School: KeyboardProvider slot
  readonly children: React.ReactNode;
}
export declare function NajmNextAppProvider<T>(props: NajmNextAppProviderProps<T>): React.JSX.Element;
```

Mounts each of auth/query/UI/branding/location **once**, reusing
`NajmAppProvider` + `NThemeBrandingProvider`; no new theme state; order +
extension placement explicit (School keyboard inside Query/outside UI; Kafil
settings subscription needs Query, location labels need i18n); retry fns stay in
client code, never serialized.

### 4.5 Preference source ordering (decided: additive extension of `najm-kit/server`)

No parallel institutional-preference owner is created (decided, §6.2-D1).
Currency remains institution-then-fallback only.

```ts
// Added to najm-kit/server preferences (additive; existing resolve() semantics preserved).
export type NajmPreferenceSource = "cookie" | "user" | "institution" | "fallback";
export interface NajmOrderedPreference<T> {
  readonly sources: readonly NajmPreferenceSource[];
  readonly guard: (v: unknown) => v is T; readonly fallback: T;
}
export interface NajmInstitutionalPreferences {
  readonly language: NajmOrderedPreference<string>;  // School: cookie→user→institution→fallback
  readonly theme: NajmOrderedPreference<string>;
  readonly timeZone: NajmOrderedPreference<string>;
  readonly currency: { readonly sources: readonly ["institution", "fallback"] }; // institution-owned, never locale/cookie
}
```

Preserved: Kafil `defineNajmPreferences` semantics incl. Accept-Language +
`Africa/Casablanca` default; School per-field cookie→user→school→fallback with
invalid-skip, `school-ui-*` names/paths/lifetimes/endpoints. POST **and** DELETE
preference handlers belong together in `najm-kit/server` (decided, §6.2-D7),
preserving exact cookie options and response semantics; `najm-next` may expose
thin Next route adapters but owns no preference behavior. Logout best-effort
cleanup cannot block auth logout; Kafil's logout policy unchanged.

### 4.6 Optional provider metadata + Google runtime (decided, §6.2-D3/D5)

```ts
// Common value stays provider-neutral; Google metadata is a SEPARATE optional leaf.
export interface NajmLocationValue { readonly address: string;
  readonly latitude: number | null; readonly longitude: number | null; }
export interface NajmProviderSelectionMeta { readonly placeId: string | null;
  readonly provider: "google"; readonly address: string;
  readonly latitude: number | null; readonly longitude: number | null; }
export interface NajmLocationLeafProps {
  readonly value: NajmLocationValue;
  readonly providerMeta?: NajmProviderSelectionMeta | null;
  readonly onSelect: (v: NajmLocationValue, meta?: NajmProviderSelectionMeta | null) => void;
  readonly onManualEdit: (address: string) => void;  // clears stale meta atomically (School contract)
}
```

Google loader/search stays in optional leaf exports (`najm-kit/location/google`,
`@googlemaps/js-api-loader` optional peer); disabled/no-map installs make zero
provider requests. `najm-next/location/server` is extended **additively** with a
`google` runtime resolution (current union is `disabled|leaflet` only), projecting
only browser-safe fields: public restricted `apiKey`, optional `mapId`,
`language`, `region`, plus CSP contributions. Server reads a new
`SCHOOL_LOCATION_*` prefix and accepts the existing
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` as a documented temporary fallback. Runtime
changes require restart but not rebuild under the new contract. Never serialize
an environment object or server secret.
Address-edit semantics (decided, §6.2-D5): a provider selection atomically sets
address/coordinate pair/placeId; a later manual address edit updates only the
address and clears stale provider metadata/placeId without silently
reverse-geocoding or overwriting the user's text; the last explicit complete
coordinate pair is preserved unless the user explicitly clears or selects a new
location. Kafil no-geocoder policy and Leaflet prefix/tiles/center/zoom/disabled
fallback preserved.

### 4.7 Boundaries, peers, singletons, cycles (resolved from manifests/source)

- Client/server: `najm-next/app` (pure) → `app/server` (`server-only`,
  lazy backend) → `app/react` (`use client`, public snapshot only). Never
  serialize app def, callbacks, auth instance, secrets, raw settings, or
  QueryClient. Proxy/security imports never touch theme/DB/RSC.
- Optional peers: config-only consumers need no Auth/Theme/Query/Leaflet/Google.
  Kit optionals: `next`, `najm-i18n`, `@tanstack/react-query`, CodeMirror set,
  `leaflet`, `@googlemaps/js-api-loader`. Auth optionals: `react`, `next`.
  Theme optionals: `react`, `react-dom`, `next`, `react-query`, `najm-mcp`,
  `najm-storage` (+ `sharp` optional dep). `najm-next` peers: only
  `next >=15.3.0 <17`, `react >=18.2.0 <20` — no optional peers today; new
  leaves must keep it dependency-free (currently **zero** runtime deps, zero
  `najm-*` imports in `src`).
- Context singletons: Kit `tsup splitting: true` is load-bearing (shared
  `src/providers` chunk; splitting off duplicates `NajmNextUIProvider`
  contexts). Theme `splitting: false` is intentional (no shared client chunk
  reaching controllers). New `najm-next` entries must preserve one physical
  copy of each React context in emitted output; new provider composition must
  not introduce a second UI/theme/session context.
- Cycle audit: `najm-next` (no deps) ← safe; `najm-kit` (no `najm-*` runtime
  deps; only structural `najm-i18n` snapshot + dev dep) ← safe;
  `najm-auth` (deps: cookies/core/database/guard/i18n/cache/email/rate/
  validation; no kit/next/theme) ← safe; `najm-theme` → `najm-kit` (peer
  `>=2.11.0`, `external` in tsup; type-only + `server/react` runtime import +
  settings components) with Kit never importing Theme = DAG `theme→kit`.
  **No package cycle found.** Constraint for Phase 1: keep `najm-next`
  dependency-free (structural interfaces / leaf adapters only) or re-audit.
- Secret-bearing client config: **none proposed**. Env is read server-side at
  runtime (`resolve(env)`), the client receives projected public fields only.
  Google browser key remains a public restricted key, never a server secret.

---

## 5. Representative current behavior (source + focused fixtures)

Evidence classes: **[S]** source inspection, **[F]** focused fixture/test run
this task, **[U]** unverified browser/connected behavior (not claimed).

- **[S]** Auth modes differ as configured: Kafil optimistic
  (`lib/auth.ts:53`), School authoritative (`lib/auth.ts:17`). School prefetch
  bypass branch present (`proxy.ts:25-27`) → FIX-04 (decided: evidence-gated
  investigation; cookie presence is never authorization; fix in `najm-auth` as
  a separate reviewable change only if reproduction proves a package gap,
  §6.2-D2). Layout failure semantics differ: Kafil anonymous-catch
  (`layout.tsx:48`), School propagates (`layout.tsx:44`) → decided session
  classification (§6.2-D4; Kafil's catch-all is migrated to it in Phase 5).
  **[U]** Actual prefetch/recovery, redirect, multi-`Set-Cookie`, and
  outage-vs-anonymous behavior unverified (no browser/connected runs in Phase 0).
- **[F]** `bun test test/csp-policy.test.ts test/location-config.test.ts`
  (apps/web): **23 pass / 0 fail / 66 expects**. Covers nonce/CSP composition,
  report sanitize + bounded reader, Leaflet runtime resolve. **[S]** School
  `src/lib/cspPolicy.test.ts` covers its Google policy.
- **[F]** `bun test src/lib/cspPolicy.test.ts` (School dashboard): **7 pass /
  0 fail / 33 expects**. **[U]** Production hydration nonce propagation and
  edge-policy intersection (CSP-01/02/04) unverified.
- **[F]** `bun test test/preferences.test.ts test/server-session.test.ts`
  (apps/web): **23 pass / 0 fail / 130 expects**. Covers preference resolve +
  session accessor shape. **[F]** `bun test test/theme-adoption.test.ts`:
  **13 pass / 0 fail / 125 expects**. Covers appearance/branding boundary pins.
- **[S]** Report hardening baseline (FIX-02): both current sanitizers keep
  origin+pathname and some relative/data fragments. The decided
  origins/keywords-only rule (§4.2, §6.2-D6) with its adversarial test list is
  the Phase 1 implementation basis — behavior not yet implemented.
- **[S]** Zod init divergence (FIX-03): Kafil `instrumentation-client.ts`
  (jitless, pinned by test) vs School inline `beforeInteractive` script
  (`layout.tsx:66-68`). Shared init requires verifying the installed Zod
  timing contract first — evidence gate, not verified in Phase 0 (no browser run).
- **[S]** Settings diagnostics gap (FIX-06): Kafil `serverSettings.ts:20`
  `console.warn` interpolates the raw thrown value — sanitized structured
  diagnostics are Phase 1 work.
- **[S]** Preference ownership baseline (FIX-07): School hand-rolled
  cookie→user→school→fallback + POST/DELETE trio vs Kit POST-only handlers.
  Decided: additive ordered-source extension + POST/DELETE co-ownership in
  `najm-kit/server` (§4.5, §6.2-D1/D7), implemented in Phase 2; logout cleanup
  (`clearUiPreferences`, `allSettled`) verified in source only.
- **[S]** Address-edit parity note: current School `LocationField.tsx:72-76`
  clears lat/lng (not only placeId) on manual address edit, which differs from
  the decided contract (preserve last explicit complete coordinate pair,
  §4.6/§6.2-D5). Recorded as a **Phase 3 parity-test requirement**, not a
  Phase 0 API question.
- **[S]** Version gap (FIX-08): School kit 2.11.19 / next 0.3.0 lack
  `./location/*` + `./location/server`; Google control is app-local
  (`LocationPickerDialog`) while Kit 2.13.1 already ships
  `location/google` (`createGoogleLocationAdapter`,
  `createGooglePlacesGeocoder`). Upgrade-then-migrate sequence stands.
- **[U]** PREF/BOOT/UI/LOC matrix behaviors (first-paint cookies, RTL,
  save→fresh-read→reopen location, F8 focus refresh, keyboard shortcuts,
  no-map SDK silence, runtime-config change) are source-traced only; no
  browser, persistence, hydration, registry, or deployment evidence in Phase 0
  by design.
- Non-runs (deliberate): no `bun run build`, no full `bun run test`, no e2e /
  Playwright, no `db:generate/migrate/push`, no seed/reset, no publish/dry-run,
  no remote probes. Commands executed are exactly §8.

---

## 6. Queue status, review notes, decisions, authority

### 6.1 Queue status (Phases 0–8)

| Phase | State after this task | Review / evidence notes |
| --- | --- | --- |
| 0 — Freeze contracts/baselines | **COMPLETE — ready for Phase 1** (§7) | This ledger as revised. Branch/HEAD/dirty (§1), resolutions/patches/scripts + delegation stamp (§2), traces (§3), approved contract (§4, §6.2), focused fixtures (§5). No prod-source change |
| 1 — Shared security + client init | Pending | Decided redaction rule (§6.2-D6) + FIX-03 Zod timing gate + FIX-04 investigation gate (§6.2-D2) |
| 2 — Preferences + server bootstrap | Pending | Decided additive `najm-kit/server` extension + POST/DELETE co-ownership (§6.2-D1/D7); request-isolation tests |
| 3 — Providers + location | Pending | Decided Google runtime fields + address-edit contract (§6.2-D3/D5) incl. the School lat/lng parity test; one-context + no-map proofs |
| 4 — Release candidate | Pending | Exact versions/artifacts/hashes; School consumes registry only (no workspace/file/tarball) |
| 5 — Kafil migration | Pending | Published pins + overrides audit (incl. the two patches); 8-file helper removal; no-schema-drift check; Kafil layout catch-all migrated to decided session classification (§6.2-D4) |
| 6 — School migration | Pending | Re-audit dirty tree vs §1.3; 0046/journal diff handled as its own boundary; keyboard/F8/placeId parity |
| 7 — CLI scaffolding | Pending | `najm-cli` Next templates from final contracts; disposable generated-app gates |
| 8 — Publication/rollout/completion | Pending | Per-app Git/CI/deploy/live rows stay separate; deferred deployment marked explicitly |

Per-task review/evidence convention (applies from Phase 1 on): one row per
phase recording repo/HEAD, scoped diff, installed versions, requirement IDs
(FIX/DX/AUTH/CSP/BOOT/PREF/UI/LOC/PKG/CLI), exact command + exit status,
artifacts, and limitations. Cross-repo links by repository-relative path +
commit. No raw secrets/cookies/tokens/addresses/coordinates/keys in evidence.

### 6.2 Decided contracts (approved by orchestrator 2026-09-12 — basis for Phases 1–3)

- **D1 — Preference owner.** Extend the existing `defineNajmPreferences` /
  `najm-kit/server` preference owner **additively** with typed ordered
  sources/guards (§4.5). No parallel institutional-preference owner.
  Currency remains institution-then-fallback only — never cookie, user, or locale.
- **D2 — FIX-04 gate.** Evidence-gated investigation: reproduce first. If the
  existing shared auth contract cannot express the required safe behavior, the
  fix belongs in `najm-auth` as a separate reviewable change. Cookie presence
  is never authorization. Not a public-API name decision.
- **D3 — Google runtime.** Extend `najm-next/location/server` additively with a
  `google` runtime resolution projecting only browser-safe fields: public
  restricted `apiKey`, optional `mapId`, `language`, `region`, plus CSP
  contributions (§4.6). New server-read `SCHOOL_LOCATION_*` prefix; accept the
  existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` as a documented temporary
  fallback. Runtime changes require restart but not rebuild. Never serialize an
  environment object or server secret.
- **D4 — Session classification.** Najm Auth owns session error classification.
  Verified no-session/expired/invalid-session states may resolve anonymous
  according to app policy; configuration, transport, backend, and unexpected
  failures propagate. No universal catch/default.
- **D5 — Address editing.** Preserve manual address text. A provider selection
  atomically sets address/coordinate pair/placeId. A later manual address edit
  updates only the address and clears stale provider metadata/placeId; it does
  not silently reverse-geocode or overwrite the user's text. The last explicit
  complete coordinate pair is preserved unless the user explicitly clears or
  selects a new location. Current School `LocationField` lat/lng clearing that
  differs is a Phase 3 parity-test requirement (§5).
- **D6 — Report redaction.** Origins/keywords-only, no path retention (§4.2):
  approved keywords for inline/eval/self/data/blob, normalized origins for
  absolute URLs, generic redacted keyword for relative/unparseable inputs.
  Tests cover credentials, query, fragment, path secrets, data/blob payloads,
  malformed/oversized streams, and sink failure.
- **D7 — Preference route ownership.** POST and DELETE preference handlers
  belong together in `najm-kit/server`, preserving exact cookie options and
  response semantics. `najm-next` may expose thin Next route adapters but owns
  no preference behavior.
- **D8 — Theme floor.** `najm-theme@0.2.1` is the contract floor for this plan.
  Kafil `AGENTS.md`'s `0.2.0` line is stale documentation, to be updated in the
  appropriate later scoped task — not in this ledger task.

### 6.3 Needs your eyes (remaining evidence gates + acceptance limitations only)

No unresolved public-API, client/server, ownership, redaction, or address-edit
contract decision remains. What remains is evidence and runtime proof owned by
later phases:

1. **FIX-03 Zod timing proof.** Verify the installed Zod initialization-timing
   contract and reproduce School hydration/CSP behavior before migrating to
   shared client initialization (Phase 1). No duplicate init script meanwhile.
2. **FIX-04 reproduction.** Characterize actual prefetch/recovery behavior with
   direct-navigation, tampering, and logout-race tests before any `najm-auth`
   change (Phase 1). The bypass branch stays until its replacement is tested.
3. **Browser/connected acceptance limits.** PREF/BOOT/UI/LOC matrix behaviors
   (first-paint cookies, RTL, save→fresh-read→reopen, F8 focus refresh,
   keyboard shortcuts, no-map SDK silence, runtime-config change,
   production hydration, edge-policy intersection) are source-traced only in
   Phase 0; each needs its Phase 1–6 proof. Mocked tests never establish real
   Google availability, persistence, hydration, publication, or deployment.
4. **FIX-08 registry upgrade.** School kit 2.11.19→2.13.x + next 0.3.0→0.4.x
   through published releases before shared location/preference adoption
   (Phase 6); no workspace/file/tarball consumption.
5. **School dirty-tree re-audit.** Reconcile the §1.3 working tree against this
   baseline at Phase 6 start; migration 0046/journal handling stays its own
   boundary.
6. **Kafil patch audit.** Re-audit `patches/najm-auth@4.0.2.patch` +
   `patches/najm-email@2.0.4.patch` before changing affected package versions
   (Phase 5).

### 6.4 Authority boundaries (this task + revision)

No code, publish, commit, push, deployment, provider call, browser test, DB,
install, seed, or build was authorized or performed — in the original pass or
in this revision. Specifically not modified: application/package production
source in all three repos; School dirty work + migration 0046; Kafil
`docs/plans/README.md` + untracked plan; Najm (entire repo);
orchestrator-owned brief files (`.opencode/phase0-brief.txt` and the delta
brief — read as instructions, then removed after review); git index/HEAD (no
add/commit/switch/reset/restore/clean/stash); package installs, version bumps,
migration generation/application, seed/reset, releases. Evidence is source +
safe local unit fixtures only (§5, §8). The only repository change is this
ledger file, left uncommitted.

---

## 7. Phase 0 exit verdict

Plan exit: *"agreed API contract and a source/behavior baseline covering both
apps; no unresolved dependency cycle or secret-bearing client configuration."*

- Source/behavior baseline covering both apps: **recorded** (§1–§3, §5).
- Dependency cycle: **none found** (DAG verified, §4.7).
- Secret-bearing client configuration: **none in the contract** (§4.7; D3
  projects browser-safe fields only, never env objects or server secrets).
- Agreed API contract: **approved** — §4 as bound by orchestrator decisions
  D1–D8 (§6.2). No unresolved public-API, client/server, ownership, redaction,
  or address-edit contract decision remains; §6.3 holds only evidence gates
  and acceptance limitations for later phases.

**Verdict: Phase 0 exit condition is MET — status COMPLETE, ready for Phase 1.**
Phase 0 claims no Phase 1 behavior implemented or verified. Phases 1–8 remain
**pending**; Phase 1 (shared security and client initialization) may now start
under its own authorization.

---

## 8. Verification appendix (exact commands + outcomes)

Focused fixtures (original pass; not re-run in the revision — no source they
cover was touched):

- `bun test test/csp-policy.test.ts test/location-config.test.ts`
  (`apps/web`): **23 pass, 0 fail, 66 expects** (~95 ms).
- `bun test test/preferences.test.ts test/server-session.test.ts`
  (`apps/web`): **23 pass, 0 fail, 130 expects**.
- `bun test test/theme-adoption.test.ts` (`apps/web`): **13 pass, 0 fail,
  125 expects** (~8.8 s).
- `bun test src/lib/cspPolicy.test.ts` (`apps/dashboard`): **7 pass, 0 fail,
  33 expects**.
- `git -C kafil diff --check` (original pass and revision re-run): clean
  (only a CRLF notice on pre-existing `docs/plans/README.md`, no whitespace
  errors).
- `git -C najm diff --check` (original pass and revision re-run): clean.
- `git -C school diff --check` (original pass and revision re-run): clean
  (LF/CRLF notices only, no errors).
- New-file check (revision re-run): `git status --porcelain=v1` in Kafil shows
  the pre-existing entries (`M docs/plans/README.md`, `?? .opencode/`,
  `?? NAJM-APP-INTEGRATION-DX-PLAN.md`) plus `?? docs/evidence/
  najm-app-integration-dx/` (this ledger); `git diff --stat` still lists only
  `docs/plans/README.md` (4 insertions). After orchestrator cleanup, the only
  task-owned path is `docs/evidence/najm-app-integration-dx/2026-09-12/README.md`
  (this file). Scoped status/diff for all other entries remained unchanged;
  no content hashes were taken and no `git add`/commit performed.
- Toolchain: `bun 1.3.14`. Delegation stamp: §2.5. No code, publish, commit,
  push, deployment, provider call, browser test, DB, install, seed, or build
  executed in either pass.
