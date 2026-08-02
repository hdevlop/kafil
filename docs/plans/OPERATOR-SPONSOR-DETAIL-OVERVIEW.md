# Operator Sponsor Detail Overview Plan

Status: **IMPLEMENTED — code complete; browser visual verification and screenshots pending**

Owner: internal coder

Visual direction: the sponsor overview dialog reference supplied with this
plan.

Related plan:
[`SPONSOR-DASHBOARD-REDESIGN.md`](SPONSOR-DASHBOARD-REDESIGN.md)

Roadmap relationship: this is a bounded Phase 7 presentation and reporting
extension. It does not reopen Phase 6 or change the phase order in
[`docs/PLAN.md`](../PLAN.md).

## 1. Outcome

Replace the current compact sponsor-details dialog opened from
`/operator/sponsors` with a wide sponsor overview that combines:

- five sponsor KPI cards;
- complete operator-authorized sponsor information;
- supported-budget use;
- a twelve-month contribution chart;
- recent contribution history;
- recent supported-order activity.

Reuse the visual cards created for the sponsor self-dashboard. Do not copy their
markup into `SponsorDetails.tsx`, and do not make the operator dialog call
sponsor self-service endpoints.

In Kafil, the hidden bootstrap `admin` inherits the operator management surface.
Therefore:

- keep the route at `/operator/sponsors`;
- allow both operator and inherited admin access through the existing
  `@isOperator()` and `@CanRead()` contract;
- keep permanent deletion admin-only;
- do not add a parallel `/admin/sponsors` route or a second role-specific
  implementation.

## 2. Dependency: stabilize the sponsor dashboard first

Do not extract and share defective behavior. Before starting this overview,
close the outstanding sponsor-dashboard findings:

- translate KPI labels before passing them to `NStatCard`;
- restrict every supported-family, budget, plan, and order query to the intended
  active family-target relationships;
- exclude legacy child-target assignments;
- ensure `next` and `upcoming` plan dates are not in the past;
- calculate order item counts from quantities, not order-line count;
- reuse `FamilyFundingProgress` and the accessible progress component;
- remove raw funding statuses and `transition-all`;
- show both date and amount for the next planned contribution;
- add focused sponsor-dashboard rendering and repository-boundary tests.

The shared-card extraction begins only after those focused checks pass. This
prevents the operator view from spreading known translation, privacy, and
accessibility defects.

## 3. Reference-to-Kafil mapping

| Reference panel | Kafil operator/admin implementation |
| --- | --- |
| Sponsor overview title | Translated dialog title with sponsor name in the description |
| Sponsored children | Active supported families; never child sponsorship |
| Total contributions | Validated contribution total in MAD |
| Next payment | Next planned contribution date and amount |
| Messages | Pending contributions count and amount |
| Member since | Sponsor profile creation date |
| Sponsor information | Image, account status, name, email, phone, address, gender, date of birth, CIN, and operator notes |
| Spending breakdown | Reused supported-budget card: available, reserved, and spent |
| Contributions chart | Reused twelve-month validated/pending contribution chart |
| Recent payments | Reused recent-contributions card with operator destinations |
| Recent messages | Reused recent-supported-orders card |

Kafil has no messaging, receipt-download, or payment-method module. Do not add
fake messages, fake receipts, dead buttons, or placeholder business data merely
to match the image.

Category-level spending such as `Education`, `Health`, or `Basic needs` is also
not part of the existing sponsor dashboard aggregate. This slice reuses the
current supported-budget breakdown. A category-spending report requires a
separate approved reporting contract.

## 4. Required Vercel and Next.js preflight

Before implementation, read the installed Next.js 16 guides required by
`AGENTS.md`:

- `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`
- `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `apps/web/node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`

Apply these official Vercel skills during implementation and final review:

- [React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)
- [React Composition Patterns](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns)
- [Web Interface Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines)

Concrete requirements:

- one aggregate request when the dialog opens;
- independent database reads start together and resolve with `Promise.all`;
- no list-then-detail N+1 requests;
- no `adminMode`, `isOperator`, or similar boolean-prop mode explosion in
  shared cards;
- shared cards receive formatted labels, values, destinations, and action slots
  instead of knowing the current role;
- derive presentation data in a pure mapper, not effects;
- use real links for navigation and buttons for actions;
- keep focus visible, return focus to the row action after dialog close, and
  avoid nested scrolling;
- use the current lightweight CSS/SVG charts; add no chart dependency;
- run the finished files through the latest Vercel Web Interface Guidelines.

This repository uses Bun. Do not use npm, yarn, pnpm, or `npx`.

## 5. Reuse architecture

The existing sponsor-dashboard cards currently belong to
`features/Dashboard/SponsorDashboard` and some contain sponsor-self labels and routes.
Extract only the genuinely reusable visual primitives:

```text
apps/web/src/features/SponsorOverview/
  components/
    SponsorKpiGrid.tsx
    SupportBudgetCard.tsx
    ContributionOverviewCard.tsx
    RecentContributionsCard.tsx
    RecentSupportedOrdersCard.tsx
  types.ts
  index.ts
```

Keep role-specific containers and adapters separate:

```text
apps/web/src/features/Dashboard/SponsorDashboard/
  components/
    SponsorDashboardPage.tsx
    SponsorDashboardKpiGrid.tsx
    SponsorDashboardBudgetCard.tsx
    SponsorDashboardRecentContributionsCard.tsx
    SponsorDashboardRecentOrdersCard.tsx
  lib/
    buildSponsorDashboardViewModel.ts

apps/web/src/features/Sponsors/
  components/
    SponsorOverviewDialogContent.tsx
    SponsorOverviewSkeleton.tsx
    SponsorInformationCard.tsx
    OperatorSponsorKpiGrid.tsx
    OperatorSponsorBudgetCard.tsx
    OperatorSponsorRecentContributionsCard.tsx
    OperatorSponsorRecentOrdersCard.tsx
  hooks/
    useSponsorOverview.ts
  lib/
    buildOperatorSponsorOverviewViewModel.ts
  types.ts
```

The names may be shortened if the responsibilities remain explicit. Do not
collapse this structure into one large `SponsorDetails.tsx`.

### Shared-card API rules

- `SponsorKpiGrid` receives already translated `label` and `subtext` values.
  It must never receive a translation key as visible text.
- A KPI item may provide a destination, but the shared grid does not invent one.
- `SupportBudgetCard` receives its title, total label, segments, and optional
  footer action as data/children. It contains no `/sponsor/*` route.
- `ContributionOverviewCard` remains presentation-only and accepts series,
  title, period label, language, and formatter.
- Recent contribution/order cards accept their title, empty copy, entries,
  optional row destination, and optional footer action.
- Self-dashboard wrappers supply `/sponsor/*` destinations.
- Operator wrappers supply `/operator/*` destinations or omit navigation when
  no supported filtered destination exists.
- Prefer wrapper composition and children/action slots over boolean mode props.
- Shared prop contracts live in `SponsorOverview/types.ts`. Do not repeat large
  inline prop shapes in both consumers.
- Feature `index.ts` files are public boundaries only. Implementation files use
  direct imports to avoid broad client bundles.

## 6. Backend endpoint and ownership

Add one operator-owned endpoint:

```http
GET /api/sponsors/:id/overview
```

Route requirements:

- `@Get("/:id/overview")`;
- `@isOperator()`;
- `@CanRead()`;
- `@Validate({ params: sponsorIdParams })`;
- read-only MCP metadata;
- a direct localized response-message key.

Place the static `/:id/overview` route where Najm routing will not conflict with
`/:id`; verify this against the installed Najm controller behavior and route
registration tests.

Do not call `GET /dashboard/sponsor` from the operator browser. That endpoint is
bound to the authenticated sponsor and must remain self-only.

### Service reuse

Refactor the sponsor aggregate into one reusable server method keyed by sponsor
profile ID:

```ts
getSponsorMetrics(sponsorProfileId: string)
```

Then:

- the sponsor self-dashboard resolves its own profile ID and calls the shared
  aggregate;
- `SponsorService.getOverview(id)` validates the selected sponsor, calls the
  same aggregate, and merges the operator-authorized sponsor profile;
- controllers continue to own their separate authorization boundaries;
- repository queries remain centralized instead of being copied into the
  sponsors module.

Avoid circular dependency between `SponsorService` and `DashboardService`. If
direct service injection creates a cycle, extract the profile-ID aggregate into
a small `SponsorOverviewService` inside the dashboard module and inject that
service into both callers.

### Target operator contract

```ts
interface OperatorSponsorOverviewData {
  sponsor: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    status: string;
    phone: string | null;
    cin: string | null;
    gender: "F" | "M" | null;
    address: string | null;
    dateOfBirth: string | null;
    notes: string | null;
    createdAt: string;
  };
  metrics: {
    counts: {
      activeSupportedFamilies: number;
      activePlans: number;
      pendingContributions: number;
      supportedOrders: number;
    };
    money: {
      validatedContributionMinor: number;
      pendingContributionMinor: number;
      supportedAvailableMinor: number;
      supportedReservedMinor: number;
      supportedSpentMinor: number;
    };
    nextPlannedContribution: {
      planId: string;
      amountMinor: number;
      dueAt: string;
    } | null;
    contributionTrend: Array<{
      month: string;
      validatedMinor: number;
      pendingMinor: number;
    }>;
    recentContributions: Array<{
      id: string;
      status: string;
      amountMinor: number;
      submittedAt: string;
    }>;
    recentSupportedOrders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      totalMinor: number;
      placedAt: string;
      itemCount: number;
    }>;
  };
}
```

Reuse the same server metric types as the sponsor self-dashboard. Do not define
two independently drifting copies of money, trend, contribution, or order
fields.

### Security boundaries

- Operators and inherited admins may receive the selected sponsor's private
  profile because the current sponsor-management read contract already exposes
  it.
- The response must not include password hashes, initial passwords, tokens,
  sessions, verification tokens, role assignments, audit internals, or auth
  secrets.
- Sponsor metrics may include family support references and aggregates, but not
  guardian name, family address, guardian CIN, child identity, documents,
  delivery address, or internal family notes.
- A sponsor cannot request another sponsor's operator overview.
- A family cannot request any operator sponsor overview.
- Unknown sponsor IDs return 404 without leaking whether related financial
  records exist.
- Keep financial records read-only in this dialog. Validation, refund,
  deactivation, and deletion remain explicit existing commands.

## 7. Frontend data flow

Extend the existing sponsor API and query keys:

```text
apps/web/src/services/sponsorApi.ts
  getSponsorOverview(id)

apps/web/src/features/Sponsors/hooks/sponsorKeys.ts
  detail(id)
  overview(id)

apps/web/src/features/Sponsors/hooks/useSponsorOverview.ts
  useSponsorOverview(id)
```

Rules:

- `SponsorOverviewDialogContent` receives only `sponsorId`.
- It owns the one overview query and loading/error branching.
- It does not reuse the list-row object as authoritative details.
- `SponsorOverviewSkeleton` mirrors the final dialog layout.
- A failure renders a retry action inside the dialog without closing it.
- Closing the dialog unmounts the query consumer; React Query may retain the
  normal cache under the sponsor-specific key.
- Sponsor update, status change, contribution mutation, or deletion must
  invalidate both `sponsorKeys.detail(id)` and `sponsorKeys.overview(id)`.
- Do not invalidate every dashboard query when only one sponsor changed unless
  aggregate totals are actually affected.

## 8. Dialog composition

Update `SponsorsPage.openView()`:

```text
title: Sponsor overview
description: selected sponsor name
children: <SponsorOverviewDialogContent sponsorId={sponsor.id} />
showButtons: false
size: "xxl"
height: "xl"
```

`xxl` and `xl` are installed Najm Kit dialog contracts. Validate the real
rendered width; use `full` only if `xxl` cannot hold the intended desktop grid.

The dialog body owns one vertical scroll area. Cards and charts must not create
a second vertical scroll container.

### Desktop layout

1. Five KPI cards:
   `NGrid cols={1} smCols={2} xlCols={5}`.
2. Sponsor information card:
   full width.
3. Analysis row:
   `NGrid cols={1} lgCols={12}`.
   - supported budget: `lgSpan={5}`;
   - contribution chart: `lgSpan={7}`.
4. Activity row:
   `NGrid cols={1} lgCols={2}`.
   - recent contributions;
   - recent supported orders.

### Mobile/tablet layout

- Use one column for every major panel.
- Use two KPI columns only where labels remain readable.
- Stack sponsor image above or beside identity based on available width.
- Contribution chart scrolls horizontally inside its card, never the dialog.
- Recent rows remain readable as cards/lists rather than compressed tables.
- Dialog close remains visible while the body scrolls.
- Test 320 px, 375 px, 768 px, 1024 px, and desktop.

## 9. Component behavior

### KPI row

Render:

1. Active support — supported-family count.
2. Total contributions — validated MAD total.
3. Next planned contribution — localized date and MAD amount, or no active
   plan.
4. Pending contributions — count and pending MAD amount.
5. Member since — localized sponsor profile creation date.

KPI values and labels come from the operator view-model mapper. All labels are
translated before reaching `SponsorKpiGrid`.

### Sponsor information

Create `SponsorInformationCard` using Najm Kit composition:

- `NAvatar` with `getSponsorAvatarImage`;
- `NCardInfo` or `NDetailList` for name, email, phone, address, gender, date of
  birth, CIN, account status, and member-since date;
- shared `StatusBadge` for account status;
- operator notes in a full-width final row;
- localized `Not provided` for nullable values.

Do not show the role, user ID, sponsor profile ID, or verification internals in
the visible card.

### Supported budget

Reuse `SupportBudgetCard` with:

- available;
- reserved;
- spent;
- total aggregate in the donut center;
- explicit text legend;
- neutral zero state.

Use operator copy and no sponsor-self link. If the operator budget page cannot
filter by sponsor, omit the footer instead of linking to an unrelated list.

### Contribution overview

Reuse `ContributionOverviewCard`:

- validated and pending series;
- last twelve months;
- localized month and MAD formatting;
- accessible text summary;
- no interactive period control until the server supports one.

### Recent contributions

- Reuse the shared contribution-history card.
- Show at most 5 entries.
- Include localized amount, submitted date, and shared status badge.
- Do not add receipt controls without a receipt endpoint.
- `View all` is allowed only after operator contribution filtering supports
  `sponsorProfileId` through DTO, repository, API query, URL state, and tests.
  Otherwise omit it.

### Recent supported orders

- Reuse the shared supported-order card.
- Show at most 5 active-support order summaries.
- Include order number, summed item quantity, total, placed date, and status.
- Never include recipient name, guardian identity, delivery address, or internal
  fulfillment notes.
- Add an operator `View all` destination only if sponsor filtering is
  implemented end to end. Otherwise omit it.

## 10. SOLID boundaries

- `SponsorsPage` owns table behavior and opening dialogs only.
- `SponsorOverviewDialogContent` owns query-state composition only.
- `SponsorInformationCard` owns private profile presentation only.
- Shared overview cards own reusable rendering only.
- Self and operator wrappers own destinations and role-specific copy.
- Service files own HTTP endpoint strings.
- Hooks own React Query state.
- Pure mappers own formatted view-model creation.
- Server authorization remains in controllers/guards.
- Server aggregation remains in one reusable service/repository path.

Do not introduce:

- one giant dialog component;
- duplicated copies of sponsor dashboard cards;
- card-level fetching;
- role checks inside shared cards;
- generic status mutation;
- a universal card with many boolean variants;
- a second `OperatorSponsorOverviewData` type in another folder.

## 11. Implementation slices

### Slice A — prerequisite corrections

- [x] Close every sponsor-dashboard blocker listed in Section 2.
- [x] Add focused repository and rendered-card tests.
- [x] Confirm the sponsor self-dashboard remains visually correct.

Exit: only corrected, stable cards and metrics are eligible for reuse.

### Slice B — shared card extraction

- [x] Create `features/SponsorOverview`.
- [x] Move reusable card markup without visual changes.
- [x] Add self-dashboard wrappers that preserve existing routes and copy.
- [x] Remove hardcoded `/sponsor/*` routes from shared components.
- [x] Add tests proving both consumers use the shared components.

Exit: the sponsor dashboard still behaves identically and no card markup is
duplicated.

### Slice C — operator aggregate endpoint

- [x] Add `GET /sponsors/:id/overview`.
- [x] Reuse the profile-ID sponsor metric aggregate.
- [x] Merge the authorized sponsor profile in one response.
- [x] Add route, service, repository, privacy, denial, and empty-state tests.
- [x] Confirm no schema change is required.

Exit: one authorized request returns the complete dialog contract.

### Slice D — operator overview dialog

- [x] Add service function, query key, hook, types, and pure mapper.
- [x] Build skeleton, error state, KPI row, and sponsor information card.
- [x] Compose the shared budget, trend, contribution, and order cards.
- [x] Replace the current `SponsorDetails` dialog content.
- [x] Preserve edit, deactivate/reactivate, and admin-only delete commands.

Exit: opening `View` on a sponsor renders the full overview shown by the target
composition.

### Slice E — responsive and accessibility

- [ ] Verify desktop, tablet, and mobile dialog layouts with browser screenshots.
- [ ] Verify English, French, and Arabic RTL with browser screenshots.
- [x] Verify keyboard open, internal navigation, close (E2E test added).
- [ ] Verify long name/email/address/notes behavior with browser screenshots.
- [ ] Verify light and dark themes with browser screenshots.
- [x] Run the Vercel Web Interface Guidelines audit (source-level).

Exit: the dialog remains usable at 320 px, in RTL, and without a mouse. — **Visual verification still required.**

### Slice F — closeout

- [ ] Add populated, empty, inactive-sponsor, no-plan, and zero-budget browser cases.
- [x] Add direct API denial tests for sponsor and family roles (E2E extended).
- [x] Run the full repository gate.
- [ ] Capture visual evidence (screenshots).
- [x] Record actual results in the Phase 7 evidence section.

Exit: implementation and tests are complete. **Browser visual cases and screenshots still required.**

## 12. Required tests

### Server

- operator and inherited admin can read the overview;
- sponsor and family are denied;
- unknown sponsor returns 404;
- inactive sponsor profile still shows historical authorized aggregates;
- only intended family-target support contributes to active counts and current
  budget/order projections;
- overdue plans do not become `next planned contribution`;
- recent contributions and orders are limited and correctly ordered;
- item count sums quantities;
- no guardian, child identity, family address, document, password, token,
  session, or auth-secret field appears in the response;
- independent aggregate reads stay parallel;
- no schema migration is generated.

### Web

- query keys isolate overview data by sponsor ID;
- opening two sponsors cannot reuse the wrong cached overview;
- KPI labels are translated values, not key strings;
- self-dashboard and operator dialog consume the same shared card primitives;
- shared cards contain no hardcoded role routes;
- operator wrappers provide correct destinations or intentionally omit them;
- loading, error, retry, zero, and empty states render;
- nullable profile fields use translated fallback copy;
- sponsor mutations invalidate the selected overview;
- Arabic and French contain every new key.

### Browser

- operator opens a sponsor card's `View` action and sees the full overview;
- admin sees the same overview and retains the delete action;
- sponsor information and financial aggregates match the selected sponsor;
- close restores focus to the originating action;
- keyboard-only navigation works;
- mobile does not create horizontal page/dialog overflow;
- Arabic renders RTL;
- dark theme retains readable contrast;
- sponsor/family crafted requests to the overview endpoint are denied.

## 13. Verification gate

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
bun run --cwd apps/web test:e2e
bun run --cwd apps/web smoke:phase6
```

Capture browser screenshots for:

- populated desktop operator dialog;
- populated mobile dialog;
- empty/no-plan sponsor;
- inactive sponsor;
- dark theme;
- Arabic RTL.

Do not accept source positioning as visual proof.

## 14. Definition of done

- [x] The existing sponsor-details dialog is replaced by the full overview.
- [x] Operator and inherited admin use one shared implementation.
- [x] Sponsor self-dashboard and operator dialog reuse the same visual card
      primitives.
- [x] No shared card contains role checks or hardcoded sponsor-self routes.
- [x] One authorized aggregate request loads the complete dialog.
- [x] Profile and financial authorization boundaries are covered.
- [x] No unsupported messages, receipts, payment methods, or category spending
      are fabricated.
- [x] Existing edit/lifecycle/admin-delete behavior is preserved.
- [x] Loading, error, empty states are implemented; mobile, RTL, keyboard,
      dark-theme, and long-content verification requires browser screenshots.
- [x] Full repository gates pass; E2E denial tests added; visual evidence pending.
- [ ] Phase 7 evidence records actual commands and counts; screenshots still required.
