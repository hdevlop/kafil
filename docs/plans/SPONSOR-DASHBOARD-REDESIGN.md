# Sponsor Dashboard Redesign Plan

Status: **IMPLEMENTED — code complete; browser visual verification and screenshots pending**

Owner: internal coder

Visual direction: the sponsor dashboard reference supplied with this plan.

Roadmap relationship: this is a bounded dashboard-presentation extension. It
does not reopen Phase 6, change the active Phase 7 release order, or override
[`docs/PLAN.md`](../PLAN.md).

## 1. Outcome

Redesign `/sponsor` into a clear accountability dashboard that gives a sponsor
an immediate answer to four questions:

1. Which families am I supporting?
2. How much have I contributed?
3. How is the supported budget being used?
4. What contribution or supported-order activity happened recently?

The result should follow the reference's visual hierarchy:

- welcoming page header;
- compact KPI row;
- one wide supported-family panel;
- one budget-use donut;
- one contribution trend chart;
- recent contribution and supported-order activity;
- a compact upcoming-contribution schedule.

This is an interpretation of the reference, not a literal copy. Kafil's
privacy, domain, routing, translations, and Najm Kit contracts take priority.

## 2. Non-negotiable product boundaries

- A sponsor supports a **family**, not a named child. Do not label the panel
  `My sponsored children`, render child names, show child photos, or imply that
  a child is the sponsorship target.
- A supported-family card may show only the existing privacy-safe projection:
  support reference, active child count, funding progress, support start date,
  and aggregated budget information approved for sponsors.
- Never expose guardian name, guardian CIN, address, documents, internal notes,
  raw family identity, or child identity through the dashboard endpoint.
- `Next planned contribution` must come from an active contribution plan's
  `nextDueAt`. Do not call it an automatic payment because the current flow
  records manual contributions.
- Do not add `Unread messages`, `Recent messages`, `Payment methods`, receipts,
  or message/calendar events. Those domains do not exist in the current MVP.
  Add them only through a separately approved backend feature plan.
- Do not use placeholder business data in production code. Missing data gets a
  real empty state.
- Keep the existing sponsor profile gate and backend authorization. Hiding a
  widget is never an authorization mechanism.
- Keep money in integer MAD minor units until the formatting boundary.
- Reuse the existing sponsor shell and valid routes. Do not add dead sidebar
  destinations merely to resemble the screenshot.

## 3. Reference-to-Kafil mapping

| Reference area | Kafil implementation | Data source |
| --- | --- | --- |
| Sponsor dashboard header | Existing translated sponsor welcome header and global actions | Sponsor dashboard identity |
| Total sponsorships | Active supported families | `counts.activeSupportedFamilies` |
| Total contribution | Validated sponsor contributions | `money.validatedContributionMinor` |
| Next payment | Next planned contribution, or `No active plan` | Earliest active plan `nextDueAt` |
| Unread messages | Supported orders | `counts.supportedOrders` |
| Member since | Sponsor profile creation date | `sponsorProfiles.createdAt` |
| My sponsored children | My supported families | New privacy-safe `supportedFamilies` projection |
| Family spending | Supported budget use: available, reserved, spent | Existing sponsor budget aggregation |
| Contribution overview | Twelve-month validated/pending contribution trend | Existing trend query |
| Recent payments | Recent contributions with status | Existing contribution projection |
| Recent messages | Recent supported orders | New privacy-safe recent-order projection |
| Calendar | Upcoming planned contribution dates | Active plans with `nextDueAt` |

The budget card represents the current aggregate account snapshot. Do not label
it `This month`, because current available/reserved/spent values are not a
monthly spending report.

## 4. Required Vercel and Next.js preflight

Before changing React or Next.js code, the coder must read the installed
Next.js 16 guides relevant to the slice:

- `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`
- `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- `apps/web/node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`

The implementation and final review must apply these official Vercel skills:

- [React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)
- [React Composition Patterns](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns)
- [Web Interface Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines)

Apply them as concrete gates:

- eliminate client request waterfalls and N+1 supported-family requests;
- run independent server queries in parallel;
- keep the client boundary as small as the existing auth, React Query, and
  interactive controls allow;
- do not add a chart library for charts already expressible with the current
  lightweight CSS/SVG components;
- use direct imports for implementation files; keep a feature `index.ts` only
  as its public boundary;
- avoid boolean-prop proliferation; prefer small explicit components and
  composition;
- derive values during render or in a pure mapper; do not add effects for
  derived state;
- use `Link` for navigation and real `button` elements for actions;
- keep visible focus states, semantic headings, image dimensions, useful alt
  text, reduced-motion behavior, and localized `Intl` formatting;
- if a filter is added later, persist it in the URL rather than private
  component state;
- audit the completed files against the latest Vercel Web Interface Guidelines.

This repository uses Bun. Do not use npm, yarn, pnpm, or `npx` to install the
skills or dependencies in the project.

## 5. Architecture and folder ownership

Move sponsor-overview presentation out of the broad `Dashboard` feature while
leaving the operator and family dashboards untouched.

```text
apps/web/src/features/SponsorDashboard/
  components/
    SponsorDashboardPage.tsx
    SponsorDashboardHeader.tsx
    SponsorDashboardKpiGrid.tsx
    SupportedFamiliesCard.tsx
    SupportedFamilyRow.tsx
    SupportBudgetCard.tsx
    ContributionOverviewCard.tsx
    RecentContributionsCard.tsx
    RecentSupportedOrdersCard.tsx
    UpcomingContributionsCard.tsx
    SponsorDashboardSkeleton.tsx
  config/
    sponsorDashboardKpis.ts
  hooks/
    sponsorDashboardKeys.ts
    useSponsorDashboard.ts
  lib/
    buildSponsorDashboardViewModel.ts
  types.ts
  index.ts

apps/web/src/services/
  sponsorDashboardApi.ts
```

Update these existing consumers:

```text
apps/web/src/features/SponsorProfile/components/SponsorProfileGate.tsx
apps/web/src/features/Dashboard/index.ts
apps/web/src/features/Dashboard/types.ts
apps/web/src/services/dashboardApi.ts
```

The migration is complete when sponsor-specific exports and types no longer
live in the generic `Dashboard` feature. Do not duplicate them in both places.

### Single-responsibility boundaries

- `SponsorDashboardPage.tsx` owns query-state branching and page composition
  only. It must not contain HTTP calls, DTO declarations, chart math, or large
  repeated card markup.
- `sponsorDashboardApi.ts` owns endpoint strings and transport only.
- `useSponsorDashboard.ts` owns React Query integration only.
- `buildSponsorDashboardViewModel.ts` owns pure presentation derivation such as
  KPI definitions, percentages, next-event copy inputs, and stable sorting.
- Each card component renders one dashboard concept and receives typed data.
  Card components do not fetch.
- `types.ts` owns the API contract, view-model types, and shared component prop
  types. Do not declare large inline object types in component signatures.
- `config/sponsorDashboardKpis.ts` owns the KPI label/icon/link definitions so
  the grid is open to adding a KPI without rewriting its layout.
- Keep component-specific markup local. Do not create a generic
  `UniversalDashboardCard` with many boolean mode props.

Liskov inheritance is not useful for this UI; do not introduce classes or
inheritance just to claim SOLID compliance. Favor typed composition and narrow
interfaces.

## 6. Target data contract

Continue using one authenticated aggregate endpoint:

```http
GET /api/dashboard/sponsor
```

Extend its response rather than making every dashboard card fetch separately.
The target TypeScript shape is:

```ts
interface SponsorDashboardData {
  displayName: string;
  memberSince: string;
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
  supportedFamilies: Array<{
    assignmentId: string;
    supportReference: string;
    activeChildCount: number;
    startedAt: string;
    funding: {
      targetMinor: number;
      validatedMinor: number;
      remainingMinor: number;
      percentage: number;
      status: string;
    } | null;
  }>;
  contributionTrend: Array<{
    month: string;
    validatedMinor: number;
    pendingMinor: number;
  }>;
  contributionStatuses: Array<{ status: string; count: number }>;
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
  upcomingContributions: Array<{
    planId: string;
    amountMinor: number;
    dueAt: string;
    supportReference: string;
  }>;
}
```

The exact funding field names must reuse the already published
`FamilyFundingProgress` contract when possible. Do not create a second
percentage formula in the browser.

### Server implementation rules

1. Add `createdAt` to `dashboardRepository.sponsorIdentity()`.
2. Add focused repository reads for:
   supported-family summaries, earliest active plan, upcoming plans, and recent
   supported orders.
3. Keep `dashboardService.getSponsor()` as the aggregate coordinator.
4. Start all independent reads together and resolve them with `Promise.all`.
5. Limit dashboard collections on the server:
   supported families to the active set, recent contributions to 5, recent
   orders to 5, and upcoming contributions to the next 3.
6. Avoid the current `listSponsorSupport()` client pattern for this page,
   because it lists assignments and then requests each summary separately.
7. Count and project only active family-target assignments (`childId IS NULL`).
   Exclude legacy child-target rows and count distinct family profiles.
8. Deduplicate orders when more than one historical assignment points at the
   same family.
9. Serialize dates at the HTTP boundary consistently with the existing Najm
   handler.
10. Add a privacy regression assertion that the JSON does not contain `cin`,
   `address`, `guardian`, `documents`, `notes`, child names, or raw family
   names.
11. No schema migration should be necessary: sponsor `createdAt` and plan
    `nextDueAt` already exist. If implementation discovers otherwise, stop and
    update this plan before generating a migration.

## 7. Page layout

Use the installed and verified Najm Kit 2.1.23 contracts:
`NPageLayout`, `NCard`, `NStatCard`, `NGrid`, and `NGridItem`.
`NGrid` supports responsive column props and `NGridItem` supports responsive
span props. Do not invent `NSectionGrid` or undocumented props.

### Desktop

1. Header: full width.
2. KPI row: `NGrid cols={1} smCols={2} xlCols={5}`.
3. Primary row: 12 columns.
   - supported families: `xlSpan={5}`;
   - supported budget use: `xlSpan={3}`;
   - contribution overview: `xlSpan={4}`.
4. Activity row: 12 columns.
   - recent contributions: `xlSpan={5}`;
   - recent supported orders: `xlSpan={4}`;
   - upcoming contributions: `xlSpan={3}`.

Use equal-height cards within each desktop row, but let content determine height
on small screens. Do not use fixed pixel heights for the whole dashboard.

### Mobile and tablet

- Stack the header and content panels in the same priority order as the
  questions in Section 1.
- Use 2 KPI columns where space permits and 1 column on narrow screens.
- Supported-family rows become vertical cards with the action at the bottom.
- Contribution charts may scroll horizontally inside their own card, not the
  page.
- Recent contribution/order data must remain readable without a squeezed
  desktop table. Use semantic list/card markup on mobile if needed.
- Test at 320 px, 375 px, 768 px, 1024 px, and a desktop width.
- Preserve Arabic RTL order, alignment, and chart labels.

## 8. Component behavior

### KPI grid

Render exactly these five cards:

1. Active support — count and `Supported families`.
2. Total contribution — validated MAD amount and `Validated`.
3. Next planned contribution — localized date and amount, or `No active plan`.
4. Supported orders — count and link to `/sponsor/orders`.
5. Member since — localized sponsor profile creation date.

Each actionable KPI uses a real `Link`. Do not make an entire non-actionable
card look clickable.

### Supported families

- Heading: `My supported families`.
- Show at most 3 active families on the dashboard.
- Each row shows privacy-safe support reference, active child count, support
  start date, and funding progress when available.
- Link the row/action to `/sponsor/support`; do not invent an unsupported detail
  route.
- Provide `View all support` when more active families exist.
- Empty state links to `/sponsor/support` with `Find a family to support`.
- Use a generic family icon/avatar unless a sponsor-safe media-serving contract
  is confirmed. Do not broaden protected image access as part of this redesign.

### Supported budget use

- Reuse the existing donut implementation after extracting it to its own chart
  file if the shared chart file is touched.
- Segments: spent, reserved, available.
- Center value: total supported budget snapshot.
- Add a text legend so color is not the only carrier of meaning.
- Handle a zero total with a neutral ring and explicit empty copy.
- Link to `/sponsor/budgets`.

### Contribution overview

- Display the existing 12-month validated/pending series.
- Use localized month labels and MAD values.
- Add an accessible text summary for screen readers.
- Keep the lightweight CSS/SVG implementation. Do not add Recharts or another
  chart dependency for this slice.
- The period label should be static `Last 12 months` until a real server-backed
  period filter is implemented.

### Recent contributions

- Show the latest 5 contributions with localized date, amount, and status.
- Use semantic table markup on desktop when Najm Kit supports the required
  responsive behavior; otherwise use a consistent list on every viewport.
- Use tabular numerals for comparable amount/date columns.
- Link to `/sponsor/contributions`.
- Do not show a receipt/download control until a receipt endpoint exists.

### Recent supported orders

- Show latest 5 privacy-safe supported orders.
- Include order number, item count, total, placed date, and status only.
- Do not expose delivery address, recipient/guardian identity, or internal
  fulfillment notes.
- Link to `/sponsor/orders`.

### Upcoming contributions

- Show the next 3 active plan dates ordered ascending.
- Use a compact event list rather than a decorative full calendar on mobile.
- A desktop mini-calendar is optional only if it remains keyboard-readable and
  the list stays present as the accessible source of truth.
- Do not invent child updates or messages to fill the calendar.

## 9. Loading, error, and empty states

- The page owns the single aggregate loading and error decision.
- Build a dashboard skeleton that resembles the final grid and avoids layout
  shift. Reuse Najm Kit skeleton primitives.
- A top-level request failure shows `PageErrorState` with retry.
- Empty collections are handled inside their own cards.
- `null` next plan, zero budget, zero contributions, no support, and no orders
  are all valid states and need explicit copy.
- Do not partially fabricate old dashboard data if the new aggregate contract
  fails.

## 10. Accessibility, localization, and visual rules

- Add all copy to English, French, and Arabic dictionaries. Do not hardcode
  English UI text in sponsor dashboard components.
- Format dates, numbers, percentages, and MAD through the existing Kafil
  formatting helpers backed by `Intl`.
- Use one `h1` in the page header and hierarchical card headings.
- Icon-only controls need localized `aria-label` values; decorative icons use
  `aria-hidden="true"`.
- Every interactive element needs a visible `focus-visible` treatment.
- Use native links/buttons before ARIA roles.
- Do not use `transition: all`; only transition the necessary properties.
- Respect `prefers-reduced-motion`.
- Text containers need `min-w-0`, truncation, or wrapping for long translated
  content.
- Do not rely on green/red alone for status. Keep labels and the shared
  `StatusBadge`.
- Maintain sufficient contrast in light and dark themes.
- Avoid absolute positioning for structural alignment. The reference's
  relationships must remain visually verifiable through grid/flex structure.

## 11. Implementation slices

### Slice A — contract and privacy

- [x] Add the new sponsor dashboard server projections.
- [x] Extend the server `SponsorDashboard` type.
- [x] Keep independent repository queries parallel in the service.
- [x] Add service/repository tests for empty, populated, duplicate-assignment,
      and privacy-safe results.
- [x] Confirm no migration is required with `bun run db:generate`.

Exit: one request returns every real overview widget with no sensitive fields
and no client N+1 sequence.

### Slice B — feature extraction

- [x] Create `features/SponsorDashboard` with `types`, service, query key, hook,
      pure view-model mapper, and public index.
- [x] Move sponsor-specific types out of `features/Dashboard/types.ts`.
- [x] Move `getSponsorDashboard()` out of `services/dashboardApi.ts`.
- [x] Update `SponsorProfileGate` to import the new feature.
- [x] Keep the `/sponsor` route page thin.

Exit: old sponsor overview behavior still renders through the new feature
boundary before the visual redesign begins.

### Slice C — visual composition

- [x] Implement the header and five-card KPI grid.
- [x] Implement the 5/3/4 primary row.
- [x] Implement the 5/4/3 activity row.
- [x] Extract any touched shared chart component into a dedicated file instead
      of growing `DashboardCharts.tsx`.
- [x] Use real links and real empty states.

Exit: desktop composition matches the reference hierarchy while using Kafil
content and contracts.

### Slice D — responsive, RTL, and accessibility

- [ ] Validate the listed viewport widths (320 px, 375 px, 768 px, 1024 px, desktop).
- [ ] Validate English, French, and Arabic/RTL with browser screenshots.
- [x] Complete keyboard and screen-reader labeling.
- [x] Confirm loading/error/empty/zero-value states do not shift or break the
      grid (via code review).
- [x] Run a Vercel Web Interface Guidelines audit over every changed UI file
      and fix all applicable findings (source-level).

Exit: the dashboard is usable without a mouse, at 320 px, in RTL, and with zero
business data. — **Visual verification still required.**

### Slice E — regression and closeout

- [x] Add focused web contract tests for the new folder, endpoint, query key,
      translations, links, and widget composition.
- [ ] Extend sponsor browser coverage with populated and empty overview cases.
- [x] Confirm direct cross-role URL and crafted API denials remain intact
      (E2E extended for sponsor overview endpoint).
- [x] Run the full verification gate and record actual results in the relevant
      Phase 7 evidence section.

Exit: all code checks pass. **Browser visual verification and screenshots still
required.**

## 12. Required verification

Run focused checks while implementing, then close with:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
bun run --cwd apps/web test:e2e
bun run --cwd apps/web smoke:phase6
```

Also perform visual checks for:

- populated sponsor;
- sponsor with no support;
- sponsor with support but no contributions;
- zero supported budget;
- no active contribution plan;
- long French labels;
- Arabic RTL;
- light and dark themes;
- mobile and desktop.

Do not mark a visual check complete from source inspection alone. Capture a
browser screenshot or equivalent visual evidence for the populated desktop,
mobile, dark-theme, and Arabic RTL states.

## 13. Definition of done

- [x] `/sponsor` follows the reference's hierarchy without copying unsupported
      product concepts.
- [x] Sponsor identity and family privacy rules are preserved.
- [x] The page uses one aggregate dashboard request with no N+1 fetches.
- [x] The route, service, hooks, types, mapper, and visual components have
      separate responsibilities.
- [x] No new giant page/component file or boolean-prop multipurpose component
      was introduced.
- [x] No new chart dependency was added.
- [x] All states and translations are implemented; RTL behavior and supported
      viewports require browser verification.
- [x] Full repository gates pass; sponsor browser coverage partially covered.
- [ ] Phase 7 evidence records the actual commands, counts, and screenshots.
      Screenshots still required.
