# Najm-owned first-login password setup

Status: **FINAL DESIGN — READY TO SCHEDULE**

This is the implementation companion for the forced first-login acceptance
required by root `PLAN.md` Phase 4. Root `PLAN.md` remains the execution
roadmap. Add a reference there before implementation, unless the user explicitly
authorizes this slice out of sequence.

## Final outcome

Najm owns the reusable server feature completely:

- identity normalization;
- durable credential-setup requirements;
- short-lived setup sessions;
- temporary-password login branching;
- password replacement;
- normal-session prevention;
- standard auth endpoints;
- client response handling;
- cookie persistence behavior.

Kafil ends with:

- no `packages/server/src/modules/access/` module;
- no Kafil login or first-password controller, service, repository, or table;
- no `apps/web/src/lib/authCookiePersistence.ts`;
- no `/api/access/*` auth routes;
- no credential-setup activation or policy block in `authConfig()`;
- only a temporary credential plus a provisioning flag in the existing family
  workflow, and the existing first-login UI.

Another app uses the same behavior through `provisionUser()`; it does not add
configuration or a new server module unless it intentionally overrides Najm's
defaults.

---

## 1. Design rules

### 1a. Morocco is Najm's default identity preset

Phone normalization is a general authentication concern, not a
credential-setup concern.

`najm-auth` defaults to the Moroccan identity preset:

```ts
auth(); // identity preset defaults to "ma"
```

The default pipeline:

1. lowercases email identifiers;
2. converts Moroccan local numbers such as `06...` to `+2126...`;
3. accepts already normalized E.164 numbers;
4. returns `null` for invalid identifiers.

The same resolved identity must be used by:

- login lookup;
- failed-attempt and lockout accounting;
- `authIdentityRateLimitKey`;
- client-side login normalization where applicable.

Consumers may extend the selected preset with project-specific identifiers:

```ts
auth({
  identity: {
    extend: [employeeNumberNormalizer],
  },
});
```

An app for another country replaces the local-country preset instead of
appending an ambiguous second local-phone normalizer:

```ts
auth({ identity: { preset: "tn" } });
auth({ identity: { preset: null, extend: [customNormalizer] } });
```

Local numbers are country-ambiguous, so `ma` and `tn` must not both claim
the same raw `06...` input. Project-specific extensions run before the
selected country preset; generic email/E.164 handling remains the final
fallback.

### 1b. Password setup is a built-in Najm flow

This slice implements a reusable built-in `password` setup flow. Kafil does
not register an application handler class.

The standard flow is enabled by `auth()` itself:

```ts
auth();
```

There is no required `credentialSetup.password: true` switch. Najm mounts the
standard endpoints and services with safe defaults; they have no effect unless
a user has a durable setup requirement. `credentialSetup` configuration exists
only for a consumer that intentionally overrides policy such as password
strength or setup-session lifetime.

Najm owns:

- validation of the active setup session;
- comparison against the current password;
- hashing and updating the replacement password;
- durable requirement completion;
- setup-session consumption;
- cookie clearing;
- the transaction around all of those operations.

Najm defaults include the password policy, a ten-minute setup lifetime, and the
standard setup cookie. Kafil uses those defaults. Do not add a Kafil password
schema, cookie name, TTL, normalizer array, or activation flag.

No role name such as `family` belongs in the Najm contract. The durable
requirement row is authoritative.

### 1c. Provisioning marks the requirement

Extend Najm provisioning so an existing domain workflow can create a user with
a temporary password and atomically require replacement:

```ts
await authService.provisionUser({
  email,
  phone,
  role: "family",
  temporaryCredential: {
    kind: "ma-cin",
    value: guardianCin,
  },
  requireCredentialSetup: "password",
});
```

When `requireCredentialSetup: "password"` is present:

- Najm accepts `temporaryCredential` rather than applying new-user
  password-strength rules to the temporary value;
- a string temporary credential is exact and case-sensitive by default;
- the built-in `ma-cin` kind trims and lowercases a valid Moroccan CIN;
- Najm normalizes and hashes the temporary credential;
- creates or updates the user as the current provisioning contract requires;
- stores the selected temporary-credential kind and marks the `password`
  requirement in the same transaction;
- issues no normal session.

The provisioning input is a discriminated union: it rejects supplying both
`password` and `temporaryCredential`, and creating a new required-password user
must include `temporaryCredential`. This prevents a caller from accidentally
creating a normal permanent password while also marking it temporary.

Extend `ProvisionUserInput` to accept optional `phone` while retaining the
current required `email` field. Normalize a supplied phone through the resolved
identity preset. Existing callers that provide only email and `password` remain
compatible. Phone-only users would require a separate users-schema migration
and are outside this slice.

An ordinary app whose student number must match exactly needs no kind or auth
configuration:

```ts
await authService.provisionUser({
  email: student.schoolEmail,
  phone: student.phone,
  role: "student",
  temporaryCredential: student.registrationNumber,
  requireCredentialSetup: "password",
});
```

Normal registration, password change, reset, and provisioning without that flag
retain their existing password-strength rules.

### 1d. No global side-effect registration

Do not add a process-global `registerCredentialSetup()` function or require
consumers to load an extra module. Najm's auth plugin always registers its own
controller, service, repository, schema, defaults, and client contracts.
Optional overrides, when genuinely needed, remain ordinary `auth({...})`
configuration.

---

## 2. Najm implementation contract

### 2a. Durable requirement schema

Add `credential_setup_requirements` to PostgreSQL and SQLite:

```text
user_id       FK users(id)
purpose       text
temporary_credential_kind  text nullable
required      boolean
completed_at  timestamp nullable
created_at    timestamp
updated_at    timestamp
PRIMARY KEY (user_id, purpose)
```

The composite key is required so one user may owe more than one future setup
purpose. Update together:

- PostgreSQL and SQLite schema definitions;
- `authSchema` aggregates;
- `AuthSchema` custom-schema type and startup validation;
- public exports and inferred types;
- declaration/API snapshots;
- dialect parity tests.

Do not use `user_id` alone as the primary key. For the built-in password flow,
`temporary_credential_kind` is `exact` or a registered built-in kind such as
`ma-cin`; it is nullable for setup purposes that do not validate a temporary
credential.

### 2b. Requirement service

Add generic operations:

```ts
markRequired(userId, purpose, options?: { temporaryCredentialKind?: string })
isRequired(userId, purpose)
listRequired(userId)
completeRequirement(userId, purpose)
```

Keep these distinct from the existing
`CredentialSetupService.require(options)`, which validates a browser setup
cookie.

Required behavior:

- marking is idempotent and resets `completedAt`;
- every read and write is purpose-scoped;
- password provisioning records the temporary-credential kind;
- completion updates only a required row;
- marking revokes existing normal sessions;
- completion runs in the same transaction as password update and setup-session
  consumption.

### 2c. Login credential validation

Split login validation from password-creation validation.

The login credential accepts a non-empty string up to bcrypt's 72-byte limit.
It must not require uppercase, lowercase, or digits because login verifies an
existing hash. Creation and replacement DTOs keep their configured strength
rules.

This is required because both Kafil's normalized CIN `ab123456` and its valid
replacement password `fatima2026` currently fail Najm's login DTO before
authentication runs.

### 2d. Login algorithm

Najm login must:

1. validate the raw identifier and credential with login-only bounds;
2. normalize the identifier using the resolved identity preset;
3. use that exact identity for rate limiting and user lookup;
4. resolve whether the user owes the built-in `password` setup purpose without
   introducing an identifier-existence timing shortcut;
5. only then normalize the submitted credential using the kind stored on that
   requirement (`exact` when omitted);
6. compare one credential hash while preserving dummy-hash timing, lockout,
   failed-attempt, active-status, and verified-email policy;
7. reveal no requirement until credentials and account policy succeed;
8. begin a short-lived setup session instead of establishing a normal session
   when replacement is required;
9. otherwise establish the normal session without transforming the password.

A user-chosen password is always compared byte-for-byte. CIN lowercasing applies
only while that user's password requirement is active and its stored temporary
credential kind is `ma-cin`.

An unknown or unavailable stored credential kind fails closed; Najm never
falls back to a different normalizer.

The response is:

```ts
type LoginResult =
  | {
      nextStep: "authenticated";
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }
  | {
      nextStep: "credential_setup";
      setupRequired: true;
      purpose: "password";
      expiresAt: string;
    };
```

The setup branch returns no usable access or refresh tokens.

### 2e. Standard endpoints

Najm owns:

```text
POST /api/auth/login
GET  /api/auth/credential-setup/setup
POST /api/auth/credential-setup/change
POST /api/auth/credential-setup/cancel
```

The change endpoint:

1. resolves the opaque setup cookie;
2. verifies its stored purpose;
3. validates `newPassword` with the configured schema;
4. rejects the current password;
5. hashes and updates the password;
6. completes the matching durable requirement;
7. consumes the setup session exactly once;
8. clears the setup cookie.

Steps 5–7 are one database transaction. A failure rolls them all back.

### 2f. Session enforcement

The requirement must cover every session-establishment path:

- password login begins setup;
- `AuthSessionService.establish()` refuses to mint a normal session for a
  required user;
- Google OAuth returns a stable `credential_setup_required` redirect without
  establishing a session;
- refresh and session recovery reject required users and clear normal cookies;
- marking a new requirement revokes current sessions.

This prevents Google verified-email auto-linking from bypassing first-login
password replacement.

### 2g. Client behavior

Extend `NajmAuthClient.login()` and `useLogin()` to:

- accept `identifier` or backwards-compatible `email`;
- accept `rememberMe`;
- return `LoginResult`;
- reset the refresh-failure circuit after any successful login response;
- call `applyTokens()` only for `nextStep: "authenticated"`;
- remain unauthenticated during credential setup.

Consumers therefore use the standard client rather than a custom login API.

### 2h. Cookie persistence

`withAuthCookiePersistence` recognizes Najm's own top-level or enveloped setup
response internally. It must:

- remove any usable `refreshToken` and `najm.session` issuance;
- preserve cookie deletions;
- clear the remember preference;
- leave the setup cookie untouched;
- clear the remember preference after successful setup completion.

Najm owns the standard setup-cookie name and ten-minute lifetime. Kafil does not
override them. The old `kafil.family-setup` cookie becomes inert when the local
access module is deleted and expires naturally; an in-flight old setup attempt
may return to login and start a new standard setup session.

Kafil keeps only its existing remember-preference cookie name during migration:

- `kafil.remember`.

The catch-all route uses Najm directly:

```ts
import { withAuthCookiePersistence } from "najm-auth/client/server";

const serverHandler = handle(server);

export const POST = withAuthCookiePersistence(serverHandler, {
  rememberCookieName: "kafil.remember",
});
```

`apps/web/src/lib/authCookiePersistence.ts` is deleted. Do not rename
`kafil.remember` without a later dual-read migration: a refresh carrying only
`kafil.remember=0` would otherwise regain persistent `Max-Age` attributes.

The `/change-password` page must not inspect a project-specific setup-cookie
name. It calls the standard Najm setup-status contract and redirects to login
when the session is missing or expired.

### 2i. Localization and package surface

Najm adds generic messages and stable error codes for:

- setup required;
- setup missing, invalid, or expired;
- password replaced;
- setup cancelled;
- OAuth blocked by a requirement.

Update every locale shipped by Najm. Kafil retains or consistently renames its
four-locale first-login UI keys.

Expose the Morocco identity helpers from a documented subpath such as:

```ts
import {
  moroccanCinTemporaryCredential,
  moroccoIdentityPreset,
} from "najm-auth/identity/ma";
```

`moroccanCinTemporaryCredential(value)` returns the structured `ma-cin`
temporary credential used by provisioning; the app does not register or call a
login normalizer.

Update `package.json` exports, `tsup.config.ts`, declarations, README,
changelog, API snapshots, and packed-artifact tests.

---

## 3. Kafil final structure

### 3a. Delete the access module

Delete `packages/server/src/modules/access/` completely after moving its
remaining owners:

| Current access item | Final owner |
|---|---|
| login controller/service/DTO | built into `najm-auth` |
| family password controller/service/repository | built into `najm-auth` |
| `family_password_requirements` | migrated to Najm requirement table, then dropped |
| Moroccan phone normalization | Najm default identity preset |
| CIN credential normalization | Najm built-in `ma-cin` kind selected during provisioning |
| family initial-password generation | existing family provisioning workflow using Najm helper |
| access rate-limit config | Najm auth rate-limit config |
| `emailVerificationTokens` | applicants email-verification schema |

Moving `emailVerificationTokens` changes only TypeScript ownership. Preserve
its SQL table and columns exactly; `db:generate` must produce no DDL for that
move.

Remove the access barrel from `packages/server/src/modules/index.ts` and all
access-specific tests after equivalent Najm and Kafil integration coverage is
green.

### 3b. Family provisioning

The existing family service derives the temporary credential and calls:

```ts
auth.provisionUser({
  ...account,
  phone,
  role: "family",
  temporaryCredential: moroccanCinTemporaryCredential(guardianCin),
  requireCredentialSetup: "password",
});
```

No AccessRepository or family-password service is injected.

### 3c. Frontend adoption

- `LoginForm` uses `auth.client.login()`.
- `nextStep: "credential_setup"` routes to `/change-password`.
- first-login setup/change/cancel use `/api/auth/credential-setup/*`.
- `/change-password` checks setup status through Najm rather than reading a
  Kafil cookie name.
- `apps/web/src/lib/authCookiePersistence.ts` is deleted.
- the catch-all POST route imports Najm's wrapper directly.
- old `/api/access/*` helpers, types, mocks, and browser waits are deleted or
  updated.

The first-login page remains Kafil UI; reusable server behavior belongs to
Najm.

---

## 4. Rollback-safe execution

Production runs migrations while the previous application is still live.
Storage migration, runtime adoption, bridge removal, and legacy table deletion
must therefore remain separate deployments.

### Move 1 — implement Najm

Repo: `Desktop/najm`, package `najm-auth`.

Implement Sections 1 and 2:

- default Moroccan identity preset with replace/extend semantics;
- PostgreSQL and SQLite requirement schemas;
- requirement service;
- phone-aware provisioning, temporary-credential kinds, and provisioning flag;
- default-on password-setup flow and endpoints;
- login-only credential validation;
- central session/OAuth/refresh enforcement;
- client discriminated response handling;
- internal cookie persistence handling;
- locales, exports, docs, declarations, and tests.

Do not consume unpublished Najm source from Kafil.

### Move 2 — validate and publish Najm

```bash
bun run test:auth
bun run build:auth
bun run test:auth:next16
bun run api:check
bun scripts/publish-package.ts najm-auth --dry-run
```

Inspect the complete worktree and exact packed artifact. The dry run must not
use a bump flag. After scope, secret, declaration, SQLite, test, build, and
tarball audits pass:

```bash
bun run pub:auth
```

Record and verify the exact published version before changing Kafil.

### Move 3 — additive Kafil bridge deployment

Goal: introduce new storage while the old access module remains active.

1. Reference this slice from root `PLAN.md`.
2. Align the root override plus web, server, and seed manifests to the exact
   published Najm version; refresh `bun.lock`.
3. Re-export `credentialSetupRequirementsTable` from the Kafil schema.
4. Keep the old table and access module unchanged.
5. Run `bun run db:generate`; it must create only
   `credential_setup_requirements`.
6. Add an idempotent backfill from `family_password_requirements` using
   purpose `password` and temporary-credential kind `ma-cin`.
7. Add two guarded synchronization triggers:
   - old family requirement writes mirror to the new password requirement with
     temporary-credential kind `ma-cin`;
   - new password requirement writes mirror to the old family table.
8. Prevent trigger recursion and ignore non-password purposes on the new table.
9. Test insert, update, completion, delete, post-backfill writes, and rollback
   behavior against PostgreSQL.
10. Deploy and accept the unchanged old flow before adoption.

Bidirectional synchronization is temporary. It protects both the old app during
cutover and the old rollback image after the new app has created users.

### Move 4 — Kafil adoption deployment

Goal: use only Najm runtime behavior and delete both local auth layers.

1. Keep `authConfig()` free of credential-setup activation and Kafil-specific
   setup policy.
2. Change family provisioning to use
   `moroccanCinTemporaryCredential(guardianCin)` with
   `requireCredentialSetup: "password"`.
3. Move `emailVerificationTokens` to applicants without changing its SQL
   shape.
4. Replace remaining phone/CIN imports with Najm identity helpers.
5. Delete `packages/server/src/modules/access/` and remove its barrel export.
6. Remove all `/api/access/*` routes and server tests superseded by Najm.
7. Switch frontend login and setup calls to standard Najm contracts.
8. Delete `apps/web/src/lib/authCookiePersistence.ts`.
9. Wrap the catch-all POST handler directly with Najm and keep
   `rememberCookieName: "kafil.remember"`.
10. Update all unit, integration, browser, and source-contract tests.
11. Run `bun run db:generate`; it must produce no migration.
12. Deploy and complete the full first-login browser acceptance.

The bidirectional database bridge remains during this release. If deployment
rolls back, the old application sees requirements created by the new app.

### Move 5 — remove the bridge

Only after Move 4 is accepted and its rollback window closes:

1. remove both synchronization triggers and their functions;
2. keep `family_password_requirements` physically present for one more
   release;
3. keep application code fully independent of that table;
4. deploy and verify Move 4 remains a safe rollback candidate.

### Move 6 — drop the legacy table

Only when Move 5 is the previous rollback candidate:

1. remove the legacy table from the source schema if a compatibility export
   remains;
2. run `bun run db:generate`;
3. confirm the migration drops only
   `family_password_requirements` and its constraints;
4. add migration-content and PostgreSQL upgrade tests;
5. deploy and verify rollback to Move 5.

Never edit an already deployed migration.

---

## 5. Required acceptance

### Najm tests

- Morocco is the default identity preset.
- custom identity normalizers extend it deterministically.
- another country preset replaces Morocco.
- `auth()` includes the standard password-setup flow without an activation
  option.
- optional credential-setup policy overrides do not change the default path.
- login and rate-limit bucketing use the same normalized identity.
- PostgreSQL and SQLite requirement schemas are equivalent.
- two purposes may coexist for one user.
- provisioning with required password setup is atomic.
- provisioning stores a supplied phone in the same normalized form used by
  login lookup.
- exact temporary credentials remain case-sensitive.
- the `ma-cin` kind is persisted and applied only to its matching requirement.
- provisioning without setup preserves normal strength validation.
- invalid credentials reveal no requirement.
- CIN normalization occurs only for an active password requirement.
- normal user-chosen passwords remain case-sensitive.
- setup login returns no normal tokens or usable normal cookies.
- password update, requirement completion, and session consumption roll back
  together.
- concurrent consumption has exactly one winner.
- OAuth, refresh, and recovery cannot bypass the requirement.
- the client does not hydrate auth for a setup response.
- the identity subpath and new contracts exist in declarations and tarball.

### Kafil tests

- bridge backfill and both synchronization directions work.
- family provisioning requires password setup without AccessRepository.
- Kafil has no credential-setup activation or policy block in `authConfig()`.
- the current lowercase replacement-password contract is preserved.
- completed setup permits later normal login.
- applicant email-verification schema relocation creates no DDL.
- operator and sponsor login remain unchanged.
- server locale parity stays green.
- no import, route, schema export, or test references the deleted access module.
- no file imports the deleted web cookie wrapper.

### Browser acceptance

Automate the journey:

1. create a family through the operator UI;
2. log in using uppercase and lowercase forms of its temporary CIN;
3. prove no dashboard or normal session exists before setup;
4. load `/change-password` through the setup cookie;
5. reject invalid and same-as-current replacements;
6. save a valid replacement password;
7. prove the setup cookie is cleared;
8. sign in again with the replacement password;
9. repeat cookie checks with Remember Me checked and unchecked;
10. verify refresh/recovery preserves the selected lifetime;
11. prove Google OAuth cannot bypass setup;
12. prove operator and sponsor login still work.

Update every browser helper that waits for `/api/access/login` and every
assertion tied to the deleted wrapper before removing its old coverage.

---

## 6. Gates

Every Kafil deployment:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
bun run test:db
```

Moves 4 and 5 also require:

```bash
bun run --cwd apps/web test:e2e
```

Expected `db:generate` results:

| Move | Expected result |
|---|---|
| 3 | create only `credential_setup_requirements` before bridge SQL is added |
| 4 | no migration |
| 5 | no migration |
| 6 | drop only `family_password_requirements` |

Any other DDL is unexplained drift and blocks the move.

Record source, PostgreSQL, browser, candidate commit, migration, GitHub, and
deployment results as separate evidence. Do not claim the whole slice complete
from one local gate.

---

## 7. Cookie isolation

Cookies are keyed by name, host/domain, and path; ports do not isolate them.

- host-only cookies on different domains or sibling subdomains do not collide;
- the same hostname on different ports, including localhost apps, does collide;
- apps on different paths collide when cookies use `Path=/`;
- `Domain=.example.com` deliberately shares cookies across subdomains.

A future multi-app design may add one `cookiePrefix` controlling refresh,
session, remember, and setup cookies together. That is outside this migration.

---

## 8. Execution order

| Move | Repo | Dependency | Boundary |
|---|---|---|---|
| 1 — reusable implementation | Najm | none | package work |
| 2 — validate and publish | Najm | 1 | registry release |
| 3 — additive storage bridge | Kafil | 2 | deploy and accept |
| 4 — adopt and delete local auth layers | Kafil | 3 accepted | deploy and accept |
| 5 — remove synchronization bridge | Kafil | 4 rollback window closed | deploy and accept |
| 6 — drop legacy table | Kafil | 5 is rollback candidate | deploy and accept |

Do not combine Moves 3–6. Their separation is what protects live writes,
durable requirements, retriable setup flows, and automatic deployment rollback.
