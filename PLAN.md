# Kafil Fix Plan

Status: **ACTIVE**

Last updated: 2026-08-03

This root plan is the working queue for newly reported fixes. Add new problems
below the current item in priority order. Do not mark an item complete without
the implementation and recorded verification evidence.

## Two-agent execution model

The work is split by repository boundary so both agents can work in parallel
without editing the same source files or lockfile.

### Agent 1 — Najm Kit shared components

Repository: `C:\Users\hdevlop\Desktop\najm`

Agent 1 owns reusable component behavior only. It must not implement Kafil API
queries, resource permissions, or page-specific workarounds.

- [x] **A0 — Baseline and contract audit:** inspect the current Najm Kit
  `NTable`, responsive card action, skeleton, pagination, tests, package export,
  and release contracts. Record the installed Kafil version before changing
  source.
- [x] **A1 — Fix 3 shared action behavior:** make responsive card row actions
  visible by default for mobile/tablet/touch and retain hover/focus behavior on
  hover-capable desktop devices.
- [x] **A2 — Fix 7 skeleton behavior:** make table/card skeleton quantity fill
  the measured parent body and make loading borders/radius/shadow match the
  loaded surface.
- [x] **A3 — Fix 8 pagination UI:** add or verify generic desktop pagination and
  mobile/tablet **Load more** contracts, including append-loading, retry,
  pending protection, focus, and accessibility.
- [x] **A4 — Najm verification:** run focused tests, typecheck, lint, build,
  package/export checks, and a dry-run package audit required by the Najm repo.
- [x] **A5 — Release handoff:** provide Agent 2 with the exact published/package
  version, changelog, verified public types, migration notes, and test evidence.

Agent 1 completion gate:

- [x] The package API is documented and exported.
- [x] No Kafil-specific names, endpoints, permissions, or layout overrides were
  added to Najm Kit.
- [x] The release artifact contains the tested code and declarations.
- [x] Agent 2 can consume the release without copying shared implementation.

Agent 1 completion evidence (2026-08-04): published `najm-kit@2.1.48`
from Najm `master` commit `e7d0ef7b0defb63a3860c9e09d9bccc8a57f5262`.
The focused table suite passed 52/52, the full Najm Kit suite passed 657/657,
and lint, typecheck, UI build, preview build, API/export checks, package dry-run,
npm registry integrity verification, and remote-SHA verification passed. The
public release exports `NTableCardPagination` and
`NTableLoadMorePagination` through the `cardPagination` prop.

### Agent 2 — Kafil product and integration

Repository: `C:\Users\hdevlop\Desktop\kafil`

Agent 2 owns Kafil backend/frontend contracts, data fetching, authorization,
privacy projections, localization, browser workflows, and final integration.

- [x] **B0 — Baseline:** preserve unrelated dirty-worktree changes, inventory
  affected tests/routes, and record the currently installed Najm versions.
- [x] **B1 — Fix 1:** collapse duplicate sponsor-dashboard assignments into one
  privacy-safe family entry with avatar and family name.
- [x] **B2 — Fix 2:** replace the standalone sponsor profile page with one
  avatar-enabled own-profile `NSheet` form.
- [x] **B3 — Fix 4:** remove mobile/tablet assignment status badges and mute the
  full card for non-active states.
- [x] **B4 — Fix 5:** simplify Order card family identity to avatar plus name.
- [ ] **B5 — Fix 6:** diagnose and repair all Brand assets previews, storage,
  fallback, caching, and production persistence behavior.
- [x] **B6 — Najm integration gate:** after A5, install the exact Agent 1 package
  release with Bun, review `package.json`/`bun.lock`, and verify declarations.
- [ ] **B7 — Fix 3 Kafil adoption:** remove the Contributions hard-coded menu,
  use the shared `NTable` menu, and verify all responsive-card consumers.
- [ ] **B8 — Fix 7 Kafil adoption:** remove obsolete skeleton workarounds and
  verify full-height/matching-surface loading in real Kafil pages.
- [ ] **B9 — Fix 8 Kafil migration:** implement server-backed pages and React
  Query state for all unbounded lists, desktop controls, and mobile/tablet
  **Load more** without automatic all-page downloads.
- [ ] **B10 — Integrated closeout:** run focused tests, the complete Kafil gate,
  browser acceptance, privacy/authorization checks, and update this plan with
  exact evidence.

Agent 2 completion gate:

- [ ] Every affected UI is localized in en/fr/ar/es and verified in Arabic RTL.
- [ ] Sponsor/family privacy projections and backend authorization are intact.
- [ ] No list silently stops at 100 or downloads every page on initial load.
- [ ] No Kafil-only copy remains for behavior now owned by Najm Kit.
- [ ] Root validation and browser acceptance evidence are recorded below the
  corresponding fix before its checkbox is marked complete.

### Parallel order and dependencies

```text
Agent 1: A0 -> A1 -> A2 -> A3 -> A4 -> A5
                    Najm package handoff |
                                       v
Agent 2: B0 -> B1/B2/B3/B4/B5 --------> B6 -> B7/B8/B9 -> B10
                                                               |
                                                               v
Coordinator:                                          Phase R -> Phase C -> GitHub main
```

- [x] Agents confirm ownership before editing; Agent 1 edits Najm only and
  Agent 2 edits Kafil only.
- [ ] Agent 2 may complete B1–B5 while Agent 1 completes A1–A5.
- [x] B6 is blocked until A5 provides a verified package artifact/version.
- [x] B7–B9 must use the installed public Najm contract, not Agent 1's source
  checkout or an unpublished local patch.
- [x] Agent 2 owns the final Kafil lockfile and resolves integration conflicts.
- [ ] Completing code locally does not authorize an early push. GitHub
  publication happens only through Phase C after Phase R and every other
  prerequisite pass.

### Phase R — Real four-account, one-Gmail plus seeded-sponsor UI acceptance

Owner: **Main coordinator after A0–A5 and B0–B10 finish**

Status: **BLOCKED until every implementation, focused test, root gate, and
per-fix acceptance item is complete**

This is the final real-user acceptance workflow before the release audit and
push. It must use the rendered Kafil UI with four isolated authenticated
accounts: the protected bootstrap admin, one newly created family, Sponsor A
created with the primary connected Gmail inbox, and Sponsor B created by the
managed demo seed and authenticated with its generated password. The seed may
establish only Sponsor B's initial identity and credential; every product
mutation must still use the rendered UI and must not be short-circuited through
direct API calls, database edits, or copied browser cookies. Gmail access is
used only to retrieve Sponsor A's exact OTP and decision message. Never write
the real mailbox address into this repository or retained evidence.

An interrupted pre-plan attempt already created a test applicant named
`Kafil Real Gmail Test` in `pending_email_verification` and delivered an OTP.
That record and message are not Phase R evidence. Start Phase R with a fresh
Gmail alias and fresh identity data. Do not delete or modify the interrupted
record unless the user separately authorizes cleanup.

#### R0 — Entry, safety, and environment gate

- [ ] A0–A5, B0–B10, and every Fix 1–8 implementation/test/acceptance/evidence
  checkbox are complete before this phase starts.
- [ ] The full local gate, database integration gate, migration-drift check,
  and production build/smoke are green at the exact worktree under test.
- [ ] Confirm the intended local/demo target, PostgreSQL database, primary Gmail
  connection, SMTP provider, protected admin credential source, and Sponsor B
  seed credential handoff without printing secrets or reading unrelated mailbox
  content. Before each OTP search, verify the connector is authorized to the
  primary mailbox.
- [ ] Use four isolated browser contexts so admin, family, Sponsor A, and Sponsor
  B cookies, Remember Me state, caches, and navigation cannot leak between
  accounts.
- [ ] Generate a unique test-run label and fresh Moroccan-friendly identity
  values. Record masked identifiers only; never record passwords, temporary
  family credentials, OTP values, session cookies, or Gmail credentials.

#### R1 — Admin and family UI setup

- [ ] Sign in through the real login UI as the existing bootstrap admin using
  the protected environment credentials; verify exact admin routing and the
  expected management navigation.
- [ ] Create one new family entirely through the admin UI, including guardian,
  unique phone/CIN, funding target, and at least one child; capture the one-time
  credential only in the active test session.
- [ ] In the isolated family context, sign in with the normalized phone/email
  identifier and temporary CIN, confirm that no normal dashboard session is
  issued, complete the mandatory first-login password replacement, and perform
  one clean login with the new permanent password.
- [ ] Verify the family dashboard/profile/catalog/cart/order surfaces expose
  only the new family's data and do not expose admin or sponsor controls.

#### R2 — One real Gmail application plus seeded sponsor login

- [ ] Derive one fresh `+kafil-a-<run-id>` alias from the primary connected Gmail
  address and submit Sponsor A through `/apply` with unique phone/CIN and a test
  password. Do not use a seeded `@demo.kafil.test` account.
- [ ] Confirm the UI reports successful delivery and remains in the setup-only
  OTP state without creating a sponsor session or granting sponsor access.
- [ ] Search Gmail narrowly by the exact alias, Kafil verification subject, and
  test start time; read only the matching message and enter its six-digit OTP
  through the UI before expiry. Do not copy the OTP into logs, screenshots,
  `PLAN.md`, audit metadata, or any persisted artifact.
- [ ] Verify the UI reaches `pending_review`, direct sponsor login is still
  denied, resend cooldown/disabled presentation is correct, and no duplicate
  applicant or sponsor profile was created.
- [ ] In the isolated admin context, open Applicants, inspect the new record,
  approve it through the UI, and verify the approval state and privacy-safe
  audit presentation.
- [ ] Search Gmail only for the matching approval message, verify delivery, then
  sign in through the real login UI as approved Sponsor A with the original
  application password.
- [ ] Select one managed Sponsor B created by the current demo seed run with a
  distinct `@demo.kafil.test` identity. Capture its generated password only at
  initial creation and keep it only in the active test session; never persist it
  in the repository, plan, screenshots, logs, or retained evidence.
- [ ] If Sponsor B already exists and its generated password is unavailable, do
  not reset it through the database or replace its identity. Rerun a supported
  fresh seed path that provides an ephemeral one-time credential handoff before
  Phase R, while preserving normal idempotent demo cleanup and account rules.
- [ ] Sign in as seeded Sponsor B through the real login UI in its isolated
  browser context. Verify the account is active and email-verified as defined by
  the managed seed, reaches only the sponsor workspace, and never enters the
  applicant, Gmail OTP, or admin-approval workflow.
- [ ] Rerun the same non-destructive demo seed and verify Sponsor B is reused
  without a duplicate auth user/profile or changed password, then perform one
  clean UI re-login with the original generated password. This is supplemental
  seed/login regression evidence and does not replace Sponsor A's real Gmail
  application, OTP, approval, and login evidence.

#### R3 — Connected three-role product journey

- [ ] As admin, create two active sponsor-to-family assignments through the UI:
  Sponsor A to the Phase R family and Sponsor B to the same family. Verify both
  assignments remain distinct while the family-level funding projection and
  active-sponsor count aggregate them correctly.
- [ ] Record the family's exact starting available/reserved/spent balances,
  funding progress, activation state, and sponsor totals before any payment so
  every later transition can be compared with a visible baseline.
- [ ] As Sponsor A, submit contribution A through the contribution UI. Verify it
  appears as `pending` for sponsor/admin, remains inside the family's available
  funding capacity, and does not credit the family budget, ledger, net funding,
  or activation progress before an admin decision.
- [ ] As admin, reject contribution A through the UI with a real reason. Verify
  the sponsor sees the same record as `rejected`, the reason/status/timestamps
  are coherent, the family balances and funding progress remain exactly at the
  baseline, and no contribution-credit ledger entry was created.
- [ ] Reopen contribution A and confirm the UI no longer offers validation,
  refund, or deletion to non-admin roles. A stale/duplicate attempt to validate
  that same rejected record must fail visibly and leave status, balances,
  funding, audit history, and outbox-derived state unchanged.
- [ ] As Sponsor A, submit contribution B through the UI. As admin, validate that
  same pending record once and verify the family available balance and net
  funding increase by exactly B's integer-minor-unit amount, one immutable
  contribution-credit ledger entry exists, and sponsor/admin/family views all
  refresh without duplicate rows or stale totals.
- [ ] Reopen contribution B after validation and confirm reject is no longer an
  available action. Repeat the validation action only through the real stale-UI
  path if it remains reachable; it must not create a second credit, ledger row,
  funding increment, audit transition, or notification.
- [ ] Use admin **Refund** on contribution B as the supported reversal of an
  already validated payment. Verify the record becomes `refunded`, one linked
  negative refund ledger entry reverses the original credit, and family
  available balance/net funding plus sponsor totals return exactly to their
  pre-B values without invalid negative/reserved/spent balances.
- [ ] Do not invent a payment-level **Cancel** action: the current contribution
  contract supports rejection while pending and refund after validation. If a
  contribution plan is created during this run, separately exercise the
  sponsor-owned pause, resume, and stop UI and verify those plan transitions do
  not rewrite contribution history or directly change the family budget.
- [ ] As Sponsor B, submit contribution C for a controlled portion of the
  remaining family target and have admin validate it. Verify the family balance
  and shared progress increase once, Sponsor B's own validated total/history
  updates, and Sponsor A's personal contribution total/history does not absorb
  or expose Sponsor B's payment record.
- [ ] As Sponsor A, submit contribution D for the exact remaining capacity and
  have admin validate it through the UI. Verify a single credit, the combined
  Sponsor A + Sponsor B net funding reaches (but does not exceed) the configured
  target, and the family activates once for the remaining order journey.
- [ ] In both sponsor contexts, verify the dashboard shows the shared family
  exactly once with the same sponsor-safe name/avatar and aggregated family
  funding progress. Each sponsor must see only its own contribution/plan history
  and must not see the other sponsor's identity, payment reference, method, or
  private data; neither may see guardian CIN, exact address, documents, notes,
  or raw evidence.
- [ ] Keep exactly the four authenticated Phase R accounts. Delivery personnel
  are operational Staff profiles, not a fourth Najm role/login. Through the
  admin UI, create or select two active Staff profiles with the `delivery`
  function for assignment, failure, reassignment, and retry evidence.
- [ ] Record the family's exact available/reserved/spent balance before ordering.
  As family, add real available catalog products and quantities to the cart,
  verify server-recalculated prices/totals and address snapshots, then submit
  order A through the UI with one idempotency-protected action.
- [ ] Verify order A becomes `pending`, its estimated total moves exactly once
  from available to reserved, the family cart clears only after success, and
  admin/family/sponsor views refresh without duplicate orders or reservations.
- [ ] Cancel order A through the family UI while it is still cancellable. Verify
  the status/timeline record the family cancellation, the full reservation is
  released back to available, spent remains unchanged, and repeating the stale
  cancel/submit action cannot release or reserve money twice.
- [ ] As family, submit order B with a fresh cart. As admin, reject that pending
  order with a real reason and verify the same complete reservation release,
  immutable status event, family-visible result, sponsor-safe summary, and no
  purchase/delivery evidence or budget drift.
- [ ] As family, submit order C for the full successful journey. As admin,
  review its product snapshots, family attribution, reserved total, and active
  delivery options, then approve it through the UI. Verify approval retains the
  estimated reservation and does not spend or release funds.
- [ ] Through the admin purchase UI, upload a real test receipt image and record
  merchant, receipt reference, purchase time, and an integer-minor-unit actual
  total. Exercise a controlled estimate variance, verify the explicit higher-
  amount confirmation when applicable, and confirm settlement changes status
  to `purchased`, clears the reservation, increases spent by actual cost, and
  returns or charges only the exact variance once.
- [ ] Assign delivery Staff A through **Delivery Details** while order C is
  eligible. Verify assignment remains planning metadata: the order stays
  `purchased`, one active attempt appears to admin, and family/sponsor views do
  not expose Staff identity/contact, internal assignment history, exact address,
  receipt, or protected evidence.
- [ ] Start Staff A's delivery through the admin UI and verify order C becomes
  `out_for_delivery` with one in-progress attempt and matching family/sponsor
  status. Record a realistic failed attempt with an internal reason; verify the
  immutable failed history remains, the active attempt closes, and the order
  returns to `purchased` without changing available/reserved/spent balances.
- [ ] Reassign order C to delivery Staff B through the UI, verify the failed
  attempt is not overwritten, then start the new attempt and confirm the order
  returns to `out_for_delivery` without duplicate active attempts or timeline
  events.
- [ ] Confirm final delivery through the admin UI using a supported confirmation
  method, delivery note, and protected test proof when required. Verify order C
  becomes `delivered`, Staff B's attempt completes exactly once, no further
  lifecycle actions remain, and duplicate confirmation cannot duplicate events,
  evidence, audit/outbox effects, or budget changes.
- [ ] Recheck order C from all four authenticated contexts: admin sees the
  protected purchase/delivery controls and immutable attempt history; family
  sees its correct totals and milestones; Sponsors A and B receive the same
  privacy-safe family usage/status without seeing each other's private payment
  data, receipt, delivery proof, Staff/private household data, or internal
  failure reasons. Confirm no impersonation or cross-account cache leakage.
- [ ] Exercise logout and clean re-login for all four accounts, including
  Remember Me on/off checks across the two sponsor contexts, and confirm each
  account returns only to its exact authorized dashboard and navigation.

#### R4 — Visual, responsive, and negative acceptance

- [ ] Capture evidence at desktop, tablet, and phone widths for the critical
  apply/OTP, admin approval, contribution decisions, cart/checkout, purchase,
  failed/retried/final delivery, family dashboard, and sponsor dashboard states
  for admin, family, Sponsor A, and Sponsor B. Arabic/RTL acceptance is not
  required in this final real-user phase.
- [ ] Verify keyboard operation, visible focus, validation/error announcements,
  pending/disabled buttons, dialogs/sheets, table/card transitions, pagination
  or **Load more**, and no horizontal overflow on the exercised paths.
- [ ] Confirm forbidden navigation and actions fail server-side as well as being
  absent from the UI: family cannot reach management actions, sponsor cannot
  read private family fields, and admin super-role access does not fabricate a
  family or sponsor ownership context.
- [ ] Review screenshots, console/network evidence, Gmail search results, and
  recorded plan notes for secrets, OTPs, cookies, private guardian data, or
  unrelated mailbox content before retaining any artifact.

#### R5 — Evidence, failure handling, and data disposition

- [ ] Record the test target, worktree commit, installed Najm versions, run
  timestamps, masked account labels, Gmail delivery result, UI checkpoints,
  screenshots, and exact pass/fail outcome for R0–R4.
- [ ] Any UI, authorization, privacy, email, session, responsive, contribution,
  or financial failure reopens the owning fix and blocks Phase C. Fix it, rerun
  the affected focused gates, then repeat Phase R from a fresh test identity.
- [ ] Inventory every applicant, account, profile, assignment, contribution,
  ledger entry, Staff profile, cart, order, purchase record, delivery attempt,
  receipt, and delivery-proof file created by this phase. Preserve the tagged
  test data by default; remove it only through an explicitly authorized,
  audited, recoverable workflow that cannot touch genuine/demo records.

#### Phase R completion gate

- [ ] One real admin, one new family, one Gmail-verified and approved Sponsor A,
  and one active seeded Sponsor B completed the connected UI journey in isolated
  sessions.
- [ ] Sponsor A's real OTP and approval delivery were verified in the single
  authorized Gmail inbox without exposing the mailbox, credentials, or OTP in
  retained evidence; Sponsor B produced no real Gmail requirement.
- [ ] Cross-role state, privacy, authorization, budgets, and order behavior
  matched the server-owned contribution, purchase, delivery, and order contracts
  at desktop, tablet, and phone widths.
- [ ] All evidence is recorded and no unresolved failure remains; Phase C may
  now begin.

### Phase C — Audit and push the completed Kafil worktree to GitHub `main`

Owner: **Main coordinator after Agent 1 and Agent 2 finish**

Target repository: `C:\Users\hdevlop\Desktop\kafil`

Target ref: `origin/main` at `https://github.com/hdevlop/kafil.git`

This phase publishes the complete intended Kafil worktree, not merely the last
agent's files. It starts only after all implementation, focused tests, Phase R
real four-account/one-Gmail-plus-seeded-sponsor browser acceptance, Najm
integration, and the complete Kafil verification gate pass.

The Najm source repository currently uses `master`, not `main`. Agent 1 must
follow the separately verified Najm release/publish workflow required by A4–A5;
Phase C must not create or push an unintended Najm `main` branch.

#### C0 — Entry gate

- [ ] A0–A5 and B0–B10 are complete.
- [ ] R0–R5 and the Phase R completion gate are complete with recorded evidence.
- [ ] Every Fix 1–8 implementation, test, acceptance, and evidence checkbox is
  complete.
- [ ] Kafil installs the exact verified Najm package version produced by the
  shared release, with no local path/link override.
- [ ] No unresolved critical/high defect, failing test, privacy leak, migration
  ambiguity, or release blocker remains.

#### C1 — Complete-worktree and secret audit

- [ ] Run `git status --short`, inspect every modified/deleted/untracked file,
  and confirm that each file belongs to the intended release.
- [ ] Review the complete diff, not only the two agents' latest changes. Record
  any pre-existing user changes that are intentionally included.
- [ ] Confirm `.env`, credentials, tokens, certificates, database dumps,
  private uploads, browser profiles, test artifacts, screenshots with private
  data, and generated build output are not staged.
- [ ] Search the staged scope for likely secrets and sensitive family/sponsor
  data before commit. A clean Git ignore rule is not a substitute for checking
  what is actually staged.
- [ ] Confirm migrations are new and intentional; no deployed migration was
  edited and generated metadata matches the schema.

#### C2 — Synchronize safely with remote `main`

- [ ] Run `git fetch origin` and record local `HEAD`, `origin/main`, and their
  ahead/behind counts.
- [ ] If `origin/main` advanced, integrate it non-destructively, resolve only
  understood conflicts, and rerun all affected tests plus the complete gate.
- [ ] Do not use `git reset --hard`, discard unrelated changes, force-push, or
  rewrite remote history.
- [ ] Confirm the final local branch is `main` and its intended upstream is
  `origin/main`.

#### C3 — Final release verification

- [ ] Run `bun run check` successfully after the final remote synchronization.
- [ ] Run `bun run test:db` successfully against the intended PostgreSQL test
  database for the backend, pagination, privacy, and concurrency changes.
- [ ] Run `bun run db:generate` and confirm either no schema drift or review and
  record the intentional new migration.
- [ ] Run the complete required browser acceptance matrix for Fixes 1–8,
  including desktop, mobile, tablet, Arabic RTL, profile/image workflows,
  pagination, actions, and loading skeletons.
- [ ] Verify production build/runtime smoke for `/`, `/dashboard`,
  `/api/system/health`, and `/api/mcp/tools` as required by `docs/PLAN.md`.
- [ ] Record exact commands, pass/fail counts, build route count, migration
  result, installed Najm versions, and any intentionally skipped environment
  smoke. Any failure reopens the owning fix and blocks the push.

#### C4 — Stage and commit the intended release

- [ ] Stage the complete audited worktree only after C1–C3 pass.
- [ ] Run `git diff --cached --check` and resolve whitespace/conflict-marker
  errors.
- [ ] Review `git diff --cached --stat` and the complete staged diff one final
  time; verify the staged set matches the C1 inventory.
- [ ] Create one clear release commit (or a small intentional commit sequence
  if required by the existing history) covering all approved Fix 1–8 work.
- [ ] Record the final commit SHA and commit message in this plan.

#### C5 — Push and verify GitHub `main`

- [ ] Push normally with `git push origin main`; do not force-push.
- [ ] Verify local `HEAD`, the fetched `origin/main`, and
  `git ls-remote origin refs/heads/main` all resolve to the same commit SHA.
- [ ] Confirm the Kafil worktree is clean after the push, or document every
  intentionally remaining local file.
- [ ] Inspect `.github/workflows/deploy-demo.yml` before pushing and record the
  automation triggered by a `main` push. The push must not be described as
  deployment success merely because Git accepted the commit.
- [ ] Monitor the triggered GitHub workflow to a terminal result. Record its
  run URL/ID and conclusion; if CI or deployment fails, report the exact failed
  job and keep production status explicitly not verified.
- [ ] If the workflow deploys the demo environment, run the authorized public
  health/smoke checks after success and keep demo deployment distinct from any
  future real-production release.

#### Phase C completion gate

- [ ] All intended Fix 1–8 changes are present on GitHub `main`.
- [ ] Local `HEAD`, `origin/main`, and GitHub's remote SHA match.
- [ ] The complete local worktree audit and secret scan are recorded.
- [ ] All validation evidence remains green at the pushed commit.
- [ ] GitHub workflow and demo deployment status are reported separately and
  honestly.

### Status and evidence rules

Each fix below has four tracking checkboxes:

- **Implementation** means the source change is complete at the correct shared
  or application boundary.
- **Tests** means every listed focused test passes, not merely that it exists.
- **Acceptance** means the visual/product criteria were exercised at the named
  responsive and RTL surfaces.
- **Evidence** means exact commands, results, package/migration versions, and
  remaining limitations are written into this plan.

A fix remains **TODO** until all four boxes are checked. If one agent finishes
its half of a cross-repository fix, record that handoff but leave the overall
fix open until Agent 2 verifies the installed integration.

## Fix 1 — Remove redundant family cards from the sponsor dashboard

Status: **TODO**

Owner: **Agent 2**

- [x] Implementation complete
- [ ] Required tests pass
- [ ] Acceptance criteria verified
- [ ] Completion evidence recorded

### Problem

The sponsor dashboard's **My supported families** section currently renders one
card per active support assignment. A sponsor can have more than one active
assignment connected to the same family, so the same family is displayed
multiple times with different assignment-based `Support xxxxxxxx` references.

The card also uses that generated support reference as its title. It must
instead show the supported family's avatar and sponsor-safe family display
name. `Support xxxxxxxx` must not appear as the family-card title.

The dashboard is a family summary, not an assignment-history list. It must show
each supported family only once while preserving the sponsor-safe family
projection and correct funding totals.

### Current cause

- `sponsorSupportedFamilies` returns active family-level support-assignment
  rows without grouping them by family.
- The dashboard projection identifies each row with `assignmentId` and creates
  its visible support reference from that assignment ID.
- `SupportedFamiliesCard` keys and renders rows by `assignmentId`, making every
  active assignment a separate card even when their `familyProfileId` matches.

### Implementation plan

1. Define the dashboard contract as one entry per unique supported family.
   Include a stable opaque family key, sponsor-safe family display name, and
   sponsor-safe family avatar. Do not expose the private family profile ID,
   guardian data, address, documents, or any other managed-household fields.
2. Fix the server-owned sponsor dashboard projection at the repository/service
   boundary so duplicate active assignments for the same family are collapsed
   before reaching the frontend. Do not add a frontend-only deduplication
   workaround.
3. For a family with multiple active assignments, choose deterministic summary
   values:
   - use the earliest active support start date;
   - count the family's active children once;
   - calculate family funding once from validated family contributions;
   - retain the existing family funding target, status, activation date, and
     sponsor-safe image behavior.
4. Keep assignment-specific data and actions on the support/contribution
   surfaces where an exact assignment is required. The dashboard family row
   should link to the shared `/family` surface and must not imply that one
   arbitrary assignment represents the whole family.
5. Update the frontend dashboard types and row rendering to use the new
   unique-family projection. Render the family avatar and family display name
   as the card identity, remove the generated `Support xxxxxxxx` title, and use
   the stable opaque family key only for React identity/navigation where
   needed. Preserve the Najm Kit card, responsive layout,
   loading/error/empty states, and en/fr/ar/es localization.
6. Keep dashboard metrics internally consistent: the supported-family KPI and
   the displayed family list must both count distinct actively supported
   families, while assignment and plan counts remain assignment/plan counts
   where their labels explicitly describe those resources.

### Required tests

- Repository/service test: two active family-level assignments for one sponsor
  and one family produce exactly one dashboard family entry.
- Repository/service test: assignments for two different families still
  produce two entries in deterministic order.
- Projection test: the merged entry uses the earliest start date and does not
  double the child count or funding amount.
- Projection test: every entry includes the sponsor-safe family display name
  and avatar while omitting the generated assignment-based support title.
- Privacy test: serialized sponsor dashboard data does not expose the internal
  family profile ID or any sensitive household identity fields.
- Frontend test: repeated assignments cannot create repeated family cards, and
  the rendered list uses the stable family key/reference.
- Browser acceptance: verify the sponsor dashboard at mobile and desktop
  widths, including Arabic RTL, with a fixture containing duplicate active
  assignments for one family.

### Acceptance criteria

- Each family appears at most once in **My supported families**.
- Each card visibly shows the supported family's avatar and family name.
- No card uses `Support xxxxxxxx` as its title.
- The supported-family KPI matches the number of distinct active families.
- Funding progress and active-child count are correct and not duplicated.
- The displayed family name and avatar are privacy-safe and consistent with
  the shared sponsor Families surface.
- Sponsors can still reach `/family`; contribution and plan workflows retain
  their exact assignment identifiers where required.
- No operator/admin family-management projection or behavior changes.
- All four locales, responsive layouts, RTL behavior, and sponsor privacy
  guarantees remain intact.

### Completion evidence to record

- Changed server and frontend files.
- Focused unit/service/browser test names and results.
- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, and
  `bun run db:generate` results.
- Migration name if schema work is unexpectedly required; otherwise record
  that no schema change was needed.

## Fix 2 — Replace the sponsor profile page with one profile sheet

Status: **TODO**

Owner: **Agent 2**

- [x] Implementation complete
- [ ] Required tests pass
- [ ] Acceptance criteria verified
- [ ] Completion evidence recorded

### Problem

The sponsor profile route repeats the same data in a read-only **Your account**
card and a separate **Update profile** form. This creates an unnecessarily long
page and makes the account UI feel like duplicated vertical sections.

Sponsors do not need a dedicated profile-view page. Opening **Profile** should
show one optimized edit surface like the existing admin sponsor form, including
the avatar and current values directly in the form.

### Implementation plan

1. Remove `/sponsor/profile` as a standalone navigation destination and remove
   the redundant read-only `SponsorProfileDetails` presentation.
2. Change the sponsor **Profile** navigation/action to open a controlled Najm
   Kit `NSheet` without navigating away from the current page. It must work
   from every sponsor dashboard route and close back to the same route/state.
3. Build one sponsor-owned profile form using the same responsive visual
   structure as the admin **Edit sponsor** form:
   - avatar upload/replacement/removal on the left at desktop widths;
   - compact two-column fields on desktop and one column on mobile;
   - one clear save action;
   - no separate read-only copy of the same values.
4. Reuse shared sponsor form field/layout components between the admin dialog
   and sponsor sheet where their contracts match. Do not duplicate an entire
   second form solely to reproduce the admin layout.
5. Keep authorization and field ownership explicit:
   - sponsors may edit only fields allowed by the own-profile backend contract;
   - avatar, phone, CIN, gender, date of birth, and address belong in the
     sponsor form once supported by that contract;
   - operator notes, role, status, password, and other management-only fields
     must not be shown or accepted;
   - name and email must remain read-only or omitted if they are controlled by
     the authenticated account contract rather than the sponsor profile.
6. Carry avatar support end to end through the own-profile DTO, service,
   sponsor-safe upload/delete authorization, response type, cache invalidation,
   and cleanup behavior. Reuse the existing protected sponsor-image pipeline;
   do not create a parallel uploader.
7. Preserve required profile completion. If a sponsor has no completed
   profile, open the same sheet in required completion mode and prevent access
   to gated sponsor capabilities until the form succeeds. Do not restore a
   separate completion page.
8. Localize all sheet titles, descriptions, labels, upload guidance, validation,
   pending states, and success/error feedback in en/fr/ar/es.

### Required tests

- Navigation test: selecting **Profile** opens `NSheet` and does not change the
  current route.
- UI test: the sheet contains one form with avatar and permitted profile fields
  and does not render a duplicate read-only details section.
- Authorization/DTO tests: sponsor updates accept only own-profile fields and
  reject management-only fields such as notes, role, and status.
- Image tests: a sponsor can upload, replace, and remove only their own avatar;
  replaced files follow the existing cleanup behavior.
- Cache test: saving refreshes the authenticated sponsor identity/avatar
  everywhere it is displayed and closes the sheet only after success.
- Completion test: an incomplete sponsor is shown required completion mode and
  cannot bypass the existing profile gate.
- Browser acceptance: open, edit, validate, save, close, and reopen the sheet
  on desktop/mobile and Arabic RTL without route navigation or duplicated data.

### Acceptance criteria

- The standalone sponsor profile view is removed from normal navigation.
- Clicking **Profile** opens a Najm `NSheet` on top of the current page.
- The sheet visually follows the compact admin sponsor form and includes the
  sponsor avatar.
- Profile values appear once, inside the editable form; there is no redundant
  read-only account/details block.
- The form is a row-based, compact desktop layout and a usable single-column
  mobile layout.
- Admin-only data and commands remain unavailable to sponsors.
- Profile completion, privacy, image security, localization, and backend-owned
  authorization remain intact.

### Completion evidence to record

- Removed route/navigation files and shared form components changed.
- Own-profile and image-contract changes, if required.
- Focused frontend, server authorization, upload, and browser test results.
- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, and
  `bun run db:generate` results.

## Fix 3 — Keep card action buttons visible on touch layouts

Status: **TODO**

Owner: **Agent 1 (shared Najm behavior) + Agent 2 (Kafil adoption)**

- [x] Implementation complete
- [ ] Required tests pass
- [ ] Acceptance criteria verified
- [ ] Completion evidence recorded

### Problem

Responsive `NTable` cards hide their row action/menu button with zero opacity
until the card is hovered. Mobile and tablet users do not have a reliable hover
interaction, so the action can be invisible even though its reserved area is
present at the top-right of each card.

The action button must be visible by default on mobile and tablet. Hover reveal
may remain only on large desktop layouts that actually support hover.

### Current cause

- Najm Kit's shared responsive table card positions the menu at the top-right
  with `opacity-0` and reveals it through `group-hover` or focus.
- Kafil's Sponsors page enables `responsiveCards`, `menuButton`, and row menu
  actions, so it inherits the shared hover-only behavior.
- This is a Najm Kit interaction defect affecting every consumer of the shared
  card action/menu, not a Sponsors-only layout problem.

### Implementation plan

1. Fix the responsive action visibility in the Najm Kit `NTable` card
   implementation and publish/install the corrected package. Do not add a
   Kafil-only selector or per-page opacity override.
2. Make the card menu/action button visible and operable by default for mobile
   and tablet layouts, including touch devices in landscape orientation.
3. Allow the subtle hidden-until-hover treatment only at the verified desktop
   breakpoint and only when the input environment supports hover. Keyboard
   focus must always reveal the control regardless of viewport size.
4. Preserve the button's top-right placement, hit target, focus ring, menu
   anchoring, card click behavior, and RTL positioning. The visible action must
   not overlap card text, avatar, selection control, or the scrollbar.
5. Verify all Kafil responsive-card consumers that use shared row menus,
   starting with Sponsors, Families, Contributions, Orders, Products, and
   Categories. No role-specific action may become visible unless its existing
   authorization/presentation condition already permits it.
6. Remove the Contributions-specific action-menu implementation:
   - stop passing a hand-built `MoreHorizontal` dropdown through
     `ContributionCard.actions`;
   - replace `menuButton: false` with the standard `NTable` row menu contract;
   - define contribution View, Validate, Reject, Refund, and Delete actions in
     the shared table menu configuration while preserving their current role,
     status, pending, expiry, danger, tooltip, and disabled conditions;
   - let `NTable` position and reveal the menu consistently with every other
     responsive card.
7. Keep desktop hover behavior consistent across mouse hover, keyboard focus,
   and hybrid touch/laptop devices. Do not make the control undiscoverable on a
   large touchscreen merely because its viewport is wide.

### Required tests

- Najm Kit component test: action/menu visibility defaults to visible below the
  desktop breakpoint.
- Najm Kit interaction test: desktop hover and focus reveal work, and a
  non-hover-capable large touch viewport keeps the action visible.
- Kafil UI test: Sponsors cards expose their permitted row menu without hover
  in mobile and tablet card modes.
- Kafil UI test: Contribution cards use the standard `NTable` menu button, not
  a card-injected hard-coded dropdown, and it is visible without hover on
  mobile and tablet.
- Contribution action test: management and sponsor/family audiences retain
  exactly their permitted View, Validate, Reject, Refund, and Delete actions
  with the existing lifecycle restrictions.
- Authorization test: changing visibility does not create actions for roles
  that lack those actions.
- Browser acceptance at representative phone, tablet, desktop, and hybrid
  touch sizes, plus Arabic RTL, proving that the action is visible, clickable,
  correctly anchored, and does not overlap content.

### Acceptance criteria

- Mobile and tablet card actions are visible by default.
- Touch users never need hover to discover or open a row menu.
- Desktop pointer users may retain the compact hover/focus reveal behavior.
- Keyboard users can always discover and operate the action.
- The shared Najm Kit contract fixes all responsive `NTable` card consumers;
  Kafil contains no redundant local workaround.
- Contributions no longer own a hard-coded ellipsis/dropdown implementation;
  they use the shared `NTable` row menu and responsive visibility behavior.
- Card layout, RTL, authorization, row selection, and row-click behavior remain
  correct.

### Completion evidence to record

- Najm Kit source, test, package version, publication, and installed-version
  changes.
- Kafil responsive-card consumers inspected and focused browser results.
- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, and
  `bun run db:generate` results in Kafil, plus the Najm release gate.

## Fix 4 — Remove mobile status badges and mute inactive cards

Status: **TODO**

Owner: **Agent 2**

- [x] Implementation complete
- [ ] Required tests pass
- [ ] Acceptance criteria verified
- [ ] Completion evidence recorded

### Problem

Support Assignment cards spend limited mobile/tablet space on an **Active**
status badge. The badge is redundant for the normal state and competes with
the card action area. Status should be communicated visually through the card:
active cards remain normal, while inactive/ended cards use a muted gray style.

### Implementation plan

1. Hide the visible `StatusBadge` in Support Assignment card mode on mobile and
   tablet widths. Keep the explicit status column/badge in desktop table mode
   or other large detail surfaces where space is available.
2. Treat every non-active assignment status as inactive for presentation and
   apply the established Kafil disabled-card treatment to the entire card:
   muted background and foreground, reduced opacity, and grayscale media.
   Reuse the same token-backed pattern already used by Sponsor, Staff, Child,
   Category, and Product cards.
3. Keep active cards at normal contrast without an **Active** chip on mobile or
   tablet. Do not replace the chip with another icon or label.
4. Preserve status semantics for assistive technology with an accessible card
   description or visually hidden localized status text. Gray styling alone
   must not be the only programmatic status signal.
5. Keep row actions available according to Fix 3. Muting an inactive card must
   not hide permitted reactivate/view actions or make their controls too faint
   to identify and operate.
6. Verify the same card behavior in en/fr/ar/es and RTL without changing the
   backend assignment lifecycle or authorization rules.

### Required tests

- Card test: active assignments render normally without a visible status badge
  below the large desktop breakpoint.
- Card test: every non-active status applies the full muted/grayscale card
  treatment, including its avatar/media.
- Accessibility test: active and inactive states remain programmatically
  available when the visible badge is hidden.
- Interaction test: permitted actions remain visible, focusable, and legible
  on inactive cards.
- Browser acceptance on phone, tablet, large desktop, and Arabic RTL layouts.

### Acceptance criteria

- Mobile and tablet Support Assignment cards show no status badge.
- Active cards use the normal card appearance.
- Inactive, ended, paused, stopped, or completed assignments use a visibly gray
  full-card treatment instead of relying on a badge.
- Desktop table status remains explicit.
- Card actions, accessibility, localization, RTL, and authorization remain
  correct.

### Completion evidence to record

- Support Assignment card and focused test changes.
- Cross-check against the established shared inactive-card presentation.
- Mobile/tablet/desktop and RTL browser screenshots or assertions.
- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, and
  `bun run db:generate` results.

## Fix 5 — Simplify family identity in Order cards

Status: **TODO**

Owner: **Agent 2**

- [x] Implementation complete
- [ ] Required tests pass
- [ ] Acceptance criteria verified
- [ ] Completion evidence recorded

### Problem

Management Order cards render the family through a generic `NCardInfo` row,
which adds a receipt-style icon and the label **Family:** before an avatar/name
value. The icon and label are redundant because the avatar and family name
already communicate the identity clearly, especially in compact card mode.

### Implementation plan

1. Replace the management-only family `NCardInfo` row in `OrderCard` with a
   direct family identity row containing the family avatar followed by the
   family name.
2. Remove the receipt/family icon and visible **Family:** label from Order card
   mode. Do not remove the family column/label from desktop table mode or order
   details where explicit labeling remains useful.
3. Reuse `ManagedAvatar` and `getFamilyAvatarImage`, preserving the existing
   sponsor/operator-safe image projection and snapshot name. Do not introduce
   a second image resolver or expose additional family data.
4. Keep the identity row compact, aligned with the remaining Phone, Delivery
   address, Delivery, Articles, Placed, and Status content. Long family names
   must truncate without shrinking or distorting the avatar.
5. Preserve the current exact-role projection: the family identity row remains
   visible only to the management audience already authorized to receive the
   guardian/family snapshot. Do not widen sponsor or family response data.
6. Give the avatar an accessible family-name alternative and ensure the name
   remains readable in en/fr/ar/es and Arabic RTL.

### Required tests

- Order card test: management cards render the family avatar and name directly
  without a family/receipt icon or visible **Family:** label.
- Role test: family and sponsor card projections do not gain management-only
  family identity data.
- Layout test: long names truncate correctly while avatar and remaining order
  information stay aligned.
- Browser acceptance on phone/tablet card mode, desktop table mode, and Arabic
  RTL, confirming the desktop family column remains unchanged.

### Acceptance criteria

- Order cards show `avatar + family name` as a direct identity row.
- No family icon or **Family:** title appears in card mode.
- The desktop table and detailed order view retain useful explicit labels.
- Privacy projections, responsive spacing, truncation, localization, and RTL
  remain correct.

### Completion evidence to record

- `OrderCard` and focused UI test changes.
- Mobile/tablet card and desktop table browser assertions.
- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, and
  `bun run db:generate` results.

## Fix 6 — Repair broken Brand assets previews

Status: **TODO**

Owner: **Agent 2**

- [ ] Investigation and implementation complete
- [ ] Required tests pass
- [ ] Acceptance criteria verified
- [ ] Completion evidence recorded

### Problem

The Settings **Brand assets** card shows broken-image placeholders for some
slots, including the expanded sidebar logo, collapsed sidebar logo, and login
hero, while another slot may still render correctly. The preview must always
show the currently resolved asset or a deliberate fallback—not a broken native
image icon and `Preview` alt text.

### Investigation plan

1. Record the configured, draft, and resolved URL for all four branding slots:
   expanded sidebar logo, collapsed sidebar logo, login logo, and login hero.
2. Request each resolved URL directly and record its HTTP status, content type,
   response size, and decoded image result. Distinguish among:
   - a stale database path whose file no longer exists;
   - incorrect factory/default asset paths;
   - production storage not containing persisted branding files;
   - an API response-envelope or content-type problem on the raw image route;
   - an `ImageInput` preview incompatibility with application-relative URLs;
   - immutable browser caching of a previously missing/replaced URL.
3. Compare the same URLs in the actual sidebar and login surfaces to determine
   whether only Settings previews fail or the resolved branding contract is
   broken application-wide.

### Implementation plan

1. Fix the owning boundary identified by the investigation. Keep branding
   paths as public, directly renderable image URLs and ensure the serve route
   returns raw bytes with the correct MIME type and cache policy.
2. Ensure factory/default assets are present in the production build/runtime
   and resolve to valid public URLs. Persisted custom assets must resolve from
   the configured durable storage location after restart and deployment.
3. Make `BrandAssetsPanel` use the same resolved asset contract as the live
   sidebar and authentication page. Do not maintain a preview-only path format.
4. Add graceful preview failure handling: if a custom asset is missing or
   undecodable, show an explicit localized unavailable/fallback state and a
   recovery action instead of the browser's broken image icon. Do not silently
   claim that the missing custom asset rendered successfully.
5. Preserve immediate preview for newly selected local files, upload progress,
   per-slot revert, fallback selection, replace/delete cleanup, dirty state,
   and the final save transaction.
6. Use unique immutable URLs only for immutable uploaded files. Factory assets
   and replaced content must not be trapped behind a stale immutable cache key.
7. Verify PNG, JPEG, WebP, and AVIF decoding within the documented size limits,
   including transparent logos and a full-height hero image.

### Required tests

- Server test: every stored branding asset route returns raw image bytes, its
  detected MIME type, and a successful response; a missing asset returns the
  expected not-found response without corrupting other slots.
- Factory-assets test: all default branding URLs exist in the production build
  layout and decode as images.
- Provider test: configured, fallback, draft, and resolved slot values produce
  the same usable URLs consumed by Settings, sidebar, and auth screens.
- UI test: all four existing assets render in `BrandAssetsPanel`; a broken URL
  shows the intentional recovery state rather than a broken `<img>` preview.
- Workflow test: upload, preview, save, reload, replace, revert, clear to
  fallback, and restart retain the correct images without stale caching.
- Browser acceptance for Settings, expanded/collapsed sidebar, and login page
  on desktop/mobile and Arabic RTL.

### Acceptance criteria

- All four Brand assets slots display their currently resolved images.
- No broken native image icon or generic `Preview` text appears.
- Sidebar and login screens render the same saved assets shown in Settings.
- Uploaded assets remain available after reload and production restart.
- Missing files produce a clear recoverable fallback state.
- Upload limits, authorization, storage cleanup, localization, and cache safety
  remain correct.

### Completion evidence to record

- Per-slot URL/status/MIME/decode investigation table and confirmed root cause.
- Branding frontend, server, storage, or factory asset changes.
- Upload/reload/restart and sidebar/login browser evidence.
- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, and
  `bun run db:generate` results.

## Fix 7 — Make Najm `NTable` skeletons fill the table body

Status: **TODO**

Owner: **Agent 1 (shared Najm behavior) + Agent 2 (Kafil adoption)**

- [x] Implementation complete
- [ ] Required tests pass
- [ ] Acceptance criteria verified
- [ ] Completion evidence recorded

### Problem

Najm Kit `NTable` loading states render a fixed, short set of skeleton rows or
cards. On full-height Kafil pages this leaves a large empty area below the
skeleton even though the final table owns the full remaining parent height.
The table skeleton also forces a border that does not consistently match the
configured border/shadow/radius of the loaded table, producing a visible style
jump and an unnecessarily harsh loading outline.

This must be fixed in Najm Kit so every Kafil `NTable` consumer receives the
same correct loading layout without page-level skeleton counts or CSS patches.

### Current cause

- `NTableLoadingSkeleton` defaults to a fixed row count and does not consume
  `calculatedPageSize`, even when `dynamicHeight` has measured the table body.
- Card skeleton count can fall back to a static/default page size; dynamic
  sizing currently measures table rows only and does not calculate how many
  responsive cards are required to cover the available grid height.
- The table loading container hard-codes `border`, while the loaded table uses
  the shared `bordered` setting, table recipe, `surfaceBorderClasses`, custom
  border color/width, radius, or shadow behavior.

### Implementation plan

1. Extend Najm Kit's shared `NTable` measurement state so loading skeletons can
   read the actual available body width and height before data arrives and on
   every parent/viewport resize.
2. For table mode, derive skeleton row count from the measured body height,
   header height, and the same row-height contract used by dynamic pagination.
   Render enough complete rows to fill the available table body without a
   large blank remainder or unnecessary page scrolling.
3. For card mode, calculate the active responsive column count from the actual
   grid/container width, estimate or measure the configured skeleton card
   height and gap, and render enough complete grid rows to cover the available
   body height. Respect consumer `classNames.cards` column overrides rather
   than assuming the default grid alone.
4. Recalculate skeleton count through `ResizeObserver` when the parent height,
   sidebar width, viewport, header/filter height, view mode, or responsive
   column count changes. Avoid resize loops and keep a small safe minimum when
   measurement is temporarily unavailable during first render/SSR.
5. Make table and card skeleton surfaces use the exact same visual contract as
   loaded content:
   - `bordered` true/false/default behavior;
   - themed table recipe border width/color and radius;
   - custom table border color and `classNames.content/cards`;
   - shadow behavior when borders are disabled;
   - identical outer dimensions so loading does not shift the page.
6. Remove the table skeleton's unconditional border. Do not simulate internal
   row separators or card outlines more strongly than the loaded component.
7. Preserve sticky header geometry, responsive hidden columns, checkbox and
   expansion placeholders, toolbar/filter skeletons, pagination space,
   scrolling, `aria-busy`, and reduced-motion behavior.
8. Publish the corrected Najm Kit version, install it in Kafil, and remove any
   Kafil-specific skeleton sizing or border workarounds made obsolete by the
   shared fix.

### Required tests

- Najm Kit measurement test: table skeleton row count grows and shrinks with
  the available parent height and matches the dynamic row-height calculation.
- Najm Kit card test: skeleton count covers the available height at one, two,
  three, four, and consumer-overridden grid column layouts.
- Resize test: changing parent height, width, toolbar height, or view mode
  updates skeleton count without observer loops or stale blank space.
- Styling matrix: table and card loading surfaces match loaded surfaces for
  bordered true, bordered false, recipe-defined borders/radius, custom border
  color, and custom content/card classes.
- Accessibility test: the loading region keeps one useful `aria-busy`/loading
  announcement and does not expose decorative skeleton rows as data.
- Kafil browser acceptance on Support Assignments and Sponsors at short and
  tall desktop viewports, plus phone/tablet card mode and Arabic RTL.

### Acceptance criteria

- `NTable` skeletons visually fill the available parent body in table and card
  modes, with no large unused area like the reported screens.
- Skeleton density adapts to parent size and responsive grid columns.
- Loading and loaded surfaces have the same outer border, radius, shadow, and
  dimensions; no harsh border or layout jump appears during transition.
- The solution is owned and released by Najm Kit, with no fixed per-page
  skeleton counts in Kafil.
- Scrolling, responsiveness, theming, accessibility, and performance remain
  correct.

### Completion evidence to record

- Before/after measurements for parent height, rendered rows/cards, unused
  vertical space, and outer surface dimensions.
- Najm Kit source/tests, package version/publication, and Kafil installed
  version.
- Support Assignments/Sponsors loading screenshots at representative desktop,
  tablet, mobile, and RTL sizes.
- Najm release checks and Kafil `bun run lint`, `bun run typecheck`,
  `bun run test`, `bun run build`, and `bun run db:generate` results.

## Fix 8 — Standardize server pagination across Kafil lists

Status: **TODO**

Owner: **Agent 1 (Najm UI contract) + Agent 2 (Kafil data migration)**

- [ ] Implementation complete
- [ ] Required tests pass
- [ ] Acceptance criteria verified
- [ ] Completion evidence recorded

### Problem

Kafil list loading is currently inconsistent:

- Orders, desktop Contributions, desktop Support Assignments, and Admin Users
  use server pagination.
- Mobile Contributions and Support Assignments automatically request every
  offset page and accumulate the complete dataset before presentation.
- Sponsors, Families, Staff, Children, Products, and Categories request only
  the first 100 rows while exposing no way to reach later records.
- Orders retain manual pagination but hide its controls below desktop widths,
  which can leave mobile/tablet users unable to reach later pages.

Large lists must use one predictable server-pagination model. Filling the
visible loading skeleton must not mean downloading the entire dataset.

### Ownership boundary

#### Najm Kit `NTable` owns reusable presentation

- Desktop page controls and page-size selection.
- Mobile/tablet **Load more** presentation for card mode.
- Generic `hasNextPage`, `onLoadMore`, `loadingMore`, and load-error contracts.
- Initial-loading versus append-loading skeletons and feedback.
- Responsive table/card transitions, focus behavior, and accessibility.
- The full-height skeleton behavior defined in Fix 7.

Najm `NTable` must not know Kafil endpoints, issue network requests, construct
domain query keys, or infer authorization and filters.

#### Kafil owns data and domain behavior

- Offset or cursor values sent to each backend list endpoint.
- Server-side search, filters, sorting, privacy projections, and authorization.
- React Query page caching/accumulation and mutation invalidation.
- `hasNextPage` or cursor metadata supplied to `NTable`.
- Resource-specific loading/error handling and URL/filter state.

### Implementation plan

1. Define and verify the common Najm `NTable` pagination contract:
   - desktop/manual page navigation remains supported;
   - card mode can render a localized **Load more** action;
   - appending a page preserves existing cards and shows a small append loader;
   - failure to load a later page preserves existing data and exposes retry;
   - duplicate load requests are prevented while one is pending.
2. Prefer server pagination for every unbounded Kafil resource. Use offset
   pagination where existing endpoints already support it; introduce cursor
   pagination only where stable ordering or high write volume materially
   benefits from it. Do not redesign all endpoints merely for uniform syntax.
3. Desktop management tables should request only the visible page, generally
   25 rows by default with available 10/25/50/100 page sizes, and send search,
   filters, and sorting to the backend before pagination.
4. Mobile/tablet card lists should request the first page and append one server
   page only when the user selects **Load more**. Do not call
   `listAllOffsetPages` for normal interactive list screens.
5. Convert the affected screens in bounded slices:
   - Contributions and Support Assignments: remove automatic all-page mobile
     loading and use paged accumulation;
   - Orders: expose reachable mobile/tablet continuation controls;
   - Sponsors, Families, Staff, and Children: replace the fixed first-100 cap
     with server pagination and mobile append behavior;
   - Products and Categories: replace the silent first-100 ceiling while
     preserving category filters and family catalog behavior;
   - review Applicants, Users, Roles, and Permissions and document any list
     intentionally loaded in full because it has a proven small bound.
6. Add reliable page metadata. Prefer an endpoint response with `rows` and
   `hasNextPage` or a cursor. Until migrated, a one-row lookahead may remain as
   a compatibility adapter, but pages must not incorrectly infer more data
   merely because the returned row count equals the limit.
7. Reset accumulated pages and pagination position whenever the role scope,
   search, filters, sort order, or authenticated identity changes. Preserve
   prior page data only during navigation where it cannot mix query scopes.
8. After create/update/delete/status mutations, invalidate every affected page
   and reconcile selection so stale or duplicate cards do not remain.
9. Preserve scroll position when appending mobile pages, announce newly loaded
   results accessibly, and avoid automatic background loading of every page.
10. Publish/install the Najm Kit pagination UI changes first, then migrate
    Kafil consumers to the verified installed contract without local copies of
    the shared **Load more** control.

### Required tests

- Najm Kit contract tests for desktop page changes, mobile **Load more**,
  append loading, retry, disabled pending state, focus restoration, and
  `hasNextPage=false` behavior.
- Kafil API/query tests proving each request contains the correct page plus
  current server-side search, filters, sorting, audience, and ownership scope.
- Mobile tests proving the first request loads one page, each user action loads
  only one additional page, and no interactive screen invokes an all-pages
  loop.
- Boundary tests with 0, 1, page-size minus 1, exact page size, page-size plus
  1, and multiple pages of records.
- Mutation tests proving invalidation prevents missing, stale, or duplicated
  rows across accumulated pages.
- Authorization/privacy tests proving pagination never mixes management,
  family, and sponsor projections.
- Browser acceptance for every converted list on desktop, mobile, tablet, and
  Arabic RTL, including search/filter reset and append failure/retry.

### Acceptance criteria

- No unbounded Kafil list downloads all rows on initial page load.
- No list silently stops at the first 100 records.
- Desktop uses server-backed page controls; mobile/tablet card mode uses
  server-backed **Load more**.
- Search, filters, and sorting are applied by the server before pagination.
- `NTable` owns only reusable pagination presentation and never fetches Kafil
  domain data itself.
- Kafil owns API requests, React Query state, scopes, privacy, and permissions.
- Initial and append skeletons accurately represent only the requested page,
  while Fix 7 still fills the visible parent loading area.
- Pagination remains responsive, accessible, localized, race-safe, and free of
  duplicate or cross-scope results.

### Completion evidence to record

- Inventory table listing every Kafil list, previous behavior, final pagination
  strategy, default page size, and mobile continuation behavior.
- Najm Kit source/tests, published version, and installed Kafil version.
- Per-resource request-count and multi-page boundary test results.
- Desktop/mobile/tablet/RTL browser results for all migrated lists.
- Najm release checks and Kafil `bun run lint`, `bun run typecheck`,
  `bun run test`, `bun run build`, and `bun run db:generate` results.

## Next fixes

Add the next reported problem here after Fix 1, with its cause, implementation
steps, required tests, acceptance criteria, and completion evidence.
