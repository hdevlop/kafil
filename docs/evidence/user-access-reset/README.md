# User access reset — implementation evidence

Scope: `USER-ACCESS-RESET-PLAN.md`, phases 1–3 plus the root gate from phase 4.
Date: 2026-09-20. Sanitized: no credentials, tokens, links, or CIN values appear
here or in any test fixture.

The verdicts below are kept separate on purpose, as the plan requires. **Source
complete**, **package complete**, **database complete**, and **git publication**
are reached. **Deployment** and **connected/browser acceptance** are not, and
nothing here should be read as claiming them.

## Phase 1 — shared Najm Auth contracts

Implemented in the sibling `najm` monorepo (`packages/najm-auth`), not duplicated
in Kafil. `najm-auth@4.0.6` had no existing-account reset: `inviteUser()` creates
a new user, `forgotPassword(email)` is email-addressed and deliberately silent
about delivery, and `UserService.update({ password })` applies permanent-password
strength rules. Three operations were added instead of composing those.

| Operation | Contract |
| --- | --- |
| `AuthService.resetToTemporaryCredential(userId, credential)` | Validates the kind (`ma-cin`), normalizes and hashes through Najm's own helper, writes the hash and the durable `password` setup requirement, and revokes every session — all under one `@Transaction`. Skips strength validation, keeps bcrypt's 72-byte bound, issues no session. |
| `AuthService.sendPasswordReset(userId)` | Reads the recipient from the account at command time. Reports `emailSent` truthfully. Leaves status and email verification untouched and revokes nothing; `resetPassword` revokes when the password is actually saved. |
| `AuthService.resendInvitation(userId)` | Pending accounts only (409 otherwise). Creates no second user or profile; reuses the existing invite token and template. |

Supporting changes: `TokenService.generateResetToken` / `generateInviteToken`
now return the token's `jti`, and `TokenService.discardSetPasswordToken(userId,
jti)` compare-and-deletes it. `UserService.update` takes the same
`validatePasswordStrength: false` opt-out `create` already had.

**Token supersession decision, tested explicitly:** minting writes one cache key
per user, so a new link supersedes any earlier one the moment it is minted. When
delivery then fails, the fresh token is discarded too. The discard is
compare-and-delete, so a late failure from an older send cannot revoke a newer
link. As shipped in 4.0.7 the discard could itself fail without saying so — see
the review follow-up at the end of this record.

- Tests: `packages/najm-auth/test/administrative-account-recovery.test.ts`, 29 new tests.
- Package gate: `bun run --cwd packages/najm-auth test` → 506 pass, 13 skip, 0 fail (plus 13 pass under `--conditions react-server`). `build` clean. `bun run api:check` → snapshot current.
- Four-locale email templates: **not applicable.** `najm-auth` ships English strings only (`src/locales/en.json`), and Kafil defines no `auth.emails` override. Subjects for these mails stay English, exactly as the pre-existing invite and forgot-password mails do. Localizing them is a separate change.

### Package complete

- Registry artifact: `najm-auth@4.0.7`, published from `dist-publish/najm-auth-4.0.7.tgz`.
- Packing commit: `e7421843eb5019d08e3fe44b9d314408a90b53c4` (najm repo).
- Registry integrity: `sha512-NvR2Nir23kdPVRuRNtpxIaMErCgnwAy3Zu3dwYyh8aVW6GXHT0mbSmP/2dMDEsGe6wQVvQK1IiKjrZ77IfFvVA==`, shasum `ff9f06c3c37b0960466c132d2c514feb0f2e8a14`, verified with `--verify-published 4.0.7` against the registry, not the local tarball.
- Consumer: Kafil root `overrides` pinned to `4.0.7`; `bun.lock` records the same integrity hash; `apps/web`, `packages/server` and `packages/seed` all resolve `4.0.7`; the three methods are present in the installed `dist/index.d.ts`.

## Phase 2 — Kafil server command

`POST /api/admin/access/users/:userId/reset-access`, `@isAdmin()`, params and
body validated, body is `{ reason }` (trimmed, 3–500).

The server picks the mode from state it reloads inside the command — role,
status, and whether the matching profile row exists. Nothing the client sends
takes part beyond the target id and the reason.

| Account | Mode |
| --- | --- |
| Active family with a family profile | `family_credential_setup` |
| Active operator / delivery with a staff profile | `reset_email_sent` |
| Active sponsor with a sponsor profile | `reset_email_sent` |
| Pending operator / delivery / sponsor with its profile | `invitation_resent` |
| Everything else | `409`, no mutation |

The linked-profile requirement is what keeps a sponsor application out: an
applicant identity is a pending user with no sponsor profile, so it is refused
rather than activated. Self-target and bootstrap admin go through the existing
`ensureSafeTarget`.

- **Privacy:** the guardian CIN is read by one narrow repository query bound to the target user id, handed straight to Najm, and never returned, audited, or logged. A stored value the Najm helper rejects is a `409` before any mutation, with a message that does not echo it.
- **Truthful delivery:** the response carries `delivery: "sent" | "simulated" | "not_sent" | "not_applicable"`. `simulated` is the console/memory provider accepting a message it never sent — read from `EmailService.getProviderName()`, so it cannot be mistaken for delivery.
- **Ordering:** the family branch commits credential, requirement, session revocation and audit together. The mail branches send outside any transaction and audit the outcome afterwards, so a partial failure is explicit rather than silent.
- **Rate limit:** `@RateLimit` keyed per target account (not per administrator), 3 per 15m, overridable via `KAFIL_ACCESS_RESET_RATE_LIMIT` / `KAFIL_ACCESS_RESET_RATE_WINDOW`. Two admins on the same row share the cooldown.
- **MCP:** deliberately not a tool. `admin-access-modules.test.ts` asserts the discovery list is unchanged and does not contain `resetAccess`.
- **Policy:** no new capability. The existing `@isAdmin()` boundary covers it, so seed definitions, grants and verification are untouched.

Tests: `packages/server/test/admin-access-modules.test.ts` — 13 new cases across
allowed modes, CIN privacy, invalid/missing CIN, applicant, inactive, profile
mismatch, self and bootstrap admin, failed send, console provider, reason
validation, and a no-sensitive-values sweep of every response.

## Phase 3 — one Users-table action

One **Reset access** entry in the existing `NTable` row menu, not a per-role
fork. Disabled for ineligible rows as presentation only; the server decides.

Card mode was checked rather than assumed: `NTable` renders each card inside
`NDataCardShell`, which is what draws the row-menu button and binds the context
menu. `AdminUsersPage` passes `menuButton` alongside `renderCard`, so the mobile
card grid offers the same `menu.row` items as the desktop table — no Kafil-side
card menu was needed.

`AdminAccessResetDialog` shows the account's name and email, a mode-specific
explanation of the real consequence, a required reason, and a destructive
confirm. It renders no password field and no CIN. On `delivery: "not_sent"` it
stays open and shows an `NAlert` instead of closing on an unearned success, and
the command hook suppresses the success toast for that case.

Translations: en, fr, ar, es for the action label, all four mode explanations,
the not-sent notice, and all five outcome messages.

Tests: `apps/web/test/admin-access-feature.test.ts` — 6 new cases covering the
eligibility matrix (including the applicant and the pending family), four-locale
coverage of all 13 new keys, row-menu exposure in both surfaces, the dialog
rendering no sensitive value and awaiting the mutation, and the request/refresh
contract.

## Root gate

Run at Kafil `8c7b91a` + this change set.

| Command | Result |
| --- | --- |
| `bun run lint` | pass (apps/web, packages/server, packages/seed) |
| `bun run typecheck` | pass |
| `bun run test` | 513 + 449 + 120 pass, 96 skip, **0 fail** |
| `bun run build` | pass |
| `bun run db:generate` | **No schema changes, nothing to migrate** — no migration generated, as expected for a schema-free change |

### Database complete

No schema change, no migration. The command reads `family_profiles.guardian_cin`
through an existing column and writes only through Najm's own auth tables.

### A build failure that was not this change

The first `bun run build` failed with 542 `Module not found` errors for
`flag-icons` SVGs out of `globals.css`. It was attributed before being worked
around: a clean `git worktree` at `HEAD` built fine, and the same worktree
carrying this entire change set also built fine. The cause was local — a
`bun install` run from a Git Bash cwd spelled `c:\Users\...` writes
`node_modules` junctions with a lowercase drive letter, which Turbopack does not
treat as absolute. Reinstalling from an uppercase-drive cwd fixed it. No source
change was involved.

## Git publication

- Kafil: `e40a3e5` on `main`, pushed to `origin/main` (`8c7b91a..e40a3e5`). 23 files, the reset slice only — unrelated in-progress work in the checkout was deliberately left out of the commit.
- najm: `33d3823` (the auth operations) and `e742184` (the 4.0.7 version bump) on `master`, pushed to `origin/master` (`bc47abc..e742184`, which also carried five earlier unpushed commits).
- Both working trees match their upstream HEAD.

## Not done, and not claimed

- **Deployment.** Nothing deployed. Deploying requires the `najm-auth@4.0.7` pin to be live on the target and the email transport verified there.
- **Connected / browser acceptance (phase 4.1–4.4).** Not run. It needs a local PostgreSQL and Mailpit, seeded isolated accounts, and the Playwright runner on `127.0.0.1:3210`; none of that was available in this environment. Specifically still owed:
  - the family journey end to end (old password denied, CIN returns `credential_setup` with no normal session, `/change-password` replaces it, CIN then fails, replay denied);
  - the staff and sponsor journeys with exactly one mail in the local mailbox, single-use and recipient-bound, sessions revoked only after the new password is saved;
  - pending re-invite creating no duplicate user or profile, and an applicant refused;
  - the denial matrix by exact response, plus desktop/mobile/keyboard/RTL coverage and a clean console/network capture;
  - `bun run test:db` for the transactional and concurrency contract.
- **Production reset execution and remote mailbox tests.** Require a separate, explicitly authorized operations step.

## Review follow-up (2026-09-20, after publication)

A review of the published slice found two behaviour gaps. Both are fixed in the
working tree; neither is committed or released yet.

### 1. A stale confirmation could authorize a different action

The dialog computed the workflow from the table row and explained it; the server
independently resolved the workflow from freshly reloaded state and ran that.
The two could disagree — a pending account activated while the table sat open
would take a password-reset mail after the administrator confirmed *resend
invitation* — and nothing detected the divergence.

The mode the dialog explained now travels with the command as `expectedMode`,
and `AdminAccessService.resetAccess` refuses with a 409 when it does not match
the mode it resolved. It remains a confirmation, never a selector: the server
still decides, and a claim that disagrees stops the command rather than steering
it. The field is optional, so a caller that claims nothing is held to nothing.
A refused command now also invalidates the account rows, so the next attempt is
confirmed against the account as it then is.

- `packages/server/src/modules/adminAccess/adminAccessDto.ts` — `accessResetDto`.
- `packages/server/src/modules/adminAccess/adminAccessService.ts` — the mismatch refusal.
- `apps/web/src/services/adminAccessApi.ts`, `.../AdminAccessUserDialogs.tsx`, `.../hooks/useAdminAccess.ts`.
- Tests: 3 new cases in `packages/server/test/admin-access-modules.test.ts` (mismatch refused with no mail and no audit; matching confirmation proceeds; a family account with an operator-shaped claim is refused rather than mailed), plus tightened assertions in `apps/web/test/admin-access-feature.test.ts`.

The refusal message is the module's existing English conflict style, surfaced by
the command hook's toast like every other reset conflict. It is not a new
localized string.

### 2. A failed send could leave a link nobody could account for

`najm-auth@4.0.7` discards the token it just minted when the mail does not
leave, but swallowed a failure of that discard: the caller was told
`emailSent: false` while a usable link remained live in the token store. The
package test suite asserted exactly that outcome.

`AdministrativeDelivery` now carries `undeliveredLinkLive`. A `false` from
compare-and-delete is not a failure — it means a newer mint already superseded
the link, which therefore cannot be consumed — so only a throw from the token
store sets the flag, and it is logged at error level rather than warn.

- `packages/najm-auth/src/auth/AuthService.ts` in the sibling `najm` checkout.
- Tests: `packages/najm-auth/test/administrative-account-recovery.test.ts` — the accepting test is replaced by one asserting the live link is reported, plus the superseded-link case and the same failure on the invitation path.
- Package gate: `bun test` in `packages/najm-auth` → 508 pass, 13 skip, 0 fail. `tsc --noEmit` reports the same 35 pre-existing errors as before the change, none in the changed files.

**Released as `najm-auth@4.0.8`.** Packed from commit `3d3cb64` under the
repository's pack-then-publish gate (clean worktree, turbo build, turbo test,
public-API snapshot current), tarball
`najm-auth-4.0.8.tgz` sha256 `95f67b8f0bbe835bb138fb856187d987506c4c0a081c8e46448687315e4e879f`,
published to the public registry and verified there — integrity
`sha512-Wmq7bPchADz1jkToYlBD6BYr+WFHCo5KQJrjyLCYT0+bDaeYavwK/kWwlRDsReOQ/zqQdCxVrEAtNyc7MPNNSw==`,
shasum `bff4aca7af75df1be7255550184a3c836ea2f023`. The installed declaration under
`packages/server/node_modules/najm-auth` carries `undeliveredLinkLive`. Kafil's root `overrides` pin moves 4.0.7 →
4.0.8.

`AdminAccessService.resetAccess` now reads the flag and adds
`undeliveredLinkLive: true` to the audit metadata when Najm reports it, and
omits the key entirely otherwise. It is value-free — no token, no link, no
address — and the response to the client is unchanged: the administrator's next
step is the same retry either way, and the next successful send supersedes the
stranded link.

### Root gate, re-run with both fixes and `najm-auth@4.0.8` installed

| Command | Result |
| --- | --- |
| `bun run lint` | pass |
| `bun run typecheck` | pass |
| `bun run test` | 513 + 454 + 120 pass, 96 skip, **0 fail** |
| `bun run build` | pass |
| `bun run db:generate` | **No schema changes, nothing to migrate** |

Still owed, unchanged by this follow-up: `bun run test:db`, the connected
browser journeys, and deployment.

### Follow-up publication

- najm: `43ac5c1` (the auth fix) and `3d3cb64` (the 4.0.8 bump) on `master`, pushed `e742184..3d3cb64`.
- Kafil: `7b1a54f` on `main`, pushed `1f45a64..7b1a54f`. 13 files, the review fixes only — the unrelated in-progress work in the checkout, including a rename already staged before this change, was left out.
- Both working trees match their upstream HEAD.

Deployment is still not done. The target must pull `najm-auth@4.0.8` before the
Kafil revision carrying this commit runs there.
