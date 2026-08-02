# Canonical Contribution Page Plan

Status: **COMPLETE — implemented and validated 2026-08-02**

This root plan is an additive task queue for the requested family contribution
history. `docs/PLAN.md` remains the authoritative product roadmap. Add further
tasks to the final section of this file before implementation begins.

## 1. Goal

Replace the role-prefixed operator contribution page with one canonical
`/contribution` page shared by admin, operator, and family accounts. The page
uses the exact authenticated role and semantic authorization guards internally:
admin/operator receive the management experience, while family receives a
read-only history scoped by the server to the signed-in family's own profile.

There must be no separate rendered `/operator/contributions` or
`/family/contributions` page implementation. If the old operator URL must be
kept temporarily for compatibility, it may only redirect to `/contribution`.

Interpret the requested hidden fields as:

- do not expose or render the sponsor's phone, email, name, avatar, or other
  identifying/contact information on the family contribution surface;
- do not expose or render the contribution payment method on the family
  surface;
- keep permitted row actions visible as individual icon buttons instead of
  collapsing them into the three-dot/ellipsis menu.

If a later task changes this interpretation, update this section before coding.

## 2. Existing Implementation to Reuse

- Existing operator route to replace:
  `apps/web/src/app/(dashboard)/operator/contributions/page.tsx`
- New canonical route:
  `apps/web/src/app/(dashboard)/contribution/page.tsx`
- Shared contribution feature: `apps/web/src/features/Contributions/`
- Operator API client: `apps/web/src/services/contributionApi.ts`
- Contribution backend module:
  `packages/server/src/modules/contributions/`
- Family navigation: `apps/web/src/shared/DashboardShell/index.tsx`
- Role permissions: `packages/server/src/config/authDefinitions.ts`

Do not create role-specific contribution page copies. Refactor the existing
feature into one page with exact-principal data selection and guarded controls,
while keeping shared formatting, status UI, pagination, and responsive
table/card behavior.

## 3. Locked Product and Security Behavior

- [x] The family can only list and view contributions whose
      `family_profile_id` belongs to its authenticated Najm user.
- [x] `/contribution` is the only rendered admin/operator/family contribution
      page and is authorized for those three roles in the route configuration.
- [x] Both operator and family sidebar items link to `/contribution`.
- [x] The family cannot supply or override a family profile ID in the request.
- [x] The family page is read-only: no record, validate, reject, refund,
      delete, bulk-delete, or row-selection controls.
- [x] Backend authorization remains authoritative; hiding controls is not the
      access boundary.
- [x] The family response projection excludes sponsor identity/contact fields,
      including name, image, gender, email, and phone.
- [x] The family response projection excludes `paymentMethod`.
- [x] The family projection also excludes operator/internal identifiers and
      private operational metadata that the page does not need.
- [x] Allowed family fields are limited to the contribution ID, amount,
      currency, safe external reference when appropriate, status, and relevant
      submitted/paid/validated/rejected/refunded/expired timestamps.
- [x] Existing operator contribution commands and financial invariants remain
      unchanged.
- [x] No database schema change or migration is expected for this slice.

## 4. Backend Slice — Role-Aware Read Guard and Projection

- [x] Keep one list URL, `GET /contributions`, for admin, operator, and family
      callers. Replace its operator-only role guard with a named guard that
      explicitly allows only those roles.
- [x] Make `GET /contributions/:id` use the same allowed-role boundary if the
      shared details dialog needs a fresh detail request.
- [x] Pass the authenticated user ID and exact role to the contribution service.
      Dispatch by exact principal: admin/operator use the management projection;
      family uses the self-owned family projection. Never infer a family profile
      for admin simply because admin satisfies inherited guards.
- [x] For family callers, reject a supplied `familyProfileId` rather than
      accepting client-selected ownership. Admin/operator keep the existing
      family/status filtering contract.
- [x] Resolve a family caller through `FamilyRepository.findByUserId`, confirm
      the exact family profile, and return not-found/forbidden behavior
      consistent with current family self-service modules.
- [x] Add repository methods that filter directly by the resolved family
      profile ID and return a dedicated family selection object. Do not fetch
      the operator projection and strip fields afterward.
- [x] Extend the contribution policy/ownership definition for the family role
      using the verified Najm join from `contributions.familyProfileId` to
      `familyProfiles.userId`, while retaining the explicit service/repository
      ownership filter as defense in depth.
- [x] Add `read:contributions` to the family role grants only. Do not grant
      create, update, or delete contribution capabilities.
- [x] Update auth seed expectations and verification so the role grant is
      repeatable and drift is detected.
- [x] Update MCP discovery expectations/metadata so the shared read tool returns
      the caller-appropriate projection while write tools remain unavailable to
      family users.

## 5. Frontend Slice — One Canonical Guarded Page

- [x] Add the single thin route
      `apps/web/src/app/(dashboard)/contribution/page.tsx`.
- [x] Remove the rendered operator-prefixed page. Keep only a redirect from the
      old URL when backward compatibility is deliberately required; do not add
      a family-prefixed contribution route.
- [x] Allow `/contribution` for admin, operator, and family in
      `apps/web/src/lib/auth.ts`. Sponsor retains its existing separate
      `/sponsor/contributions` workflow because that page owns sponsor plans and
      contribution submission rather than the shared management/history view.
- [x] Keep one `ContributionsPage` component. Select `family` versus
      `management` mode from `useKafilRole().exact`; do not derive self-service
      identity from inherited authorization.
- [x] Use the shared semantic `<Operator>` guard for record, validate, reject,
      refund, delete, selection, and bulk controls. Family mode renders the
      safe read-only configuration. Backend guards remain authoritative.
- [x] Keep the list client on `GET /contributions`, but include the exact
      workspace role/mode in React Query keys so cached management records can
      never be reused by a family session.
- [x] Keep the same page header, responsive `NTable`, status badges, pagination,
      loading state, error state, empty state, money/date formatting, table/card
      toggle behavior, and details-dialog interaction.
- [x] Build family-eligible columns from the shared column definitions while
      omitting sponsor identity/contact and payment method.
- [x] Do not invoke operator-only family or sponsor list APIs from the family
      filter bar. Offer only filters supported by the family projection, such
      as reference and status.
- [x] Build a family-safe card variant that does not show sponsor identity or
      payment method in its title, description, or detail rows.
- [x] Build a family-safe details view that does not render sponsor linkage,
      sponsor contact information, payment method, validator/rejector IDs, or
      private operational reasons.
- [x] Remove the add/record contribution button, create callback, selection
      checkboxes, and bulk controls in family mode.

## 6. Inline Icon Actions — No Three-Dot Button

- [x] Replace the contribution table's ellipsis-triggered row actions with an
      explicit Actions column built from verified Najm Kit primitives
      (`NRowActions` plus the installed icon-button/button contract).
- [x] Use Lucide icons already associated with the contribution actions:
      View, Validate, Reject, Refund, and Delete.
- [x] In operator/admin mode, show only the actions permitted by the current
      contribution status and exact role; preserve all current pending,
      validated, refunded, rejected, expired, and admin-delete rules.
- [x] In family mode, show only the View icon action.
- [x] Set `menuButton` to false or remove the menu-button configuration so no
      vertical three-dot trigger is rendered.
- [x] If the existing right-click context menu is retained as an optional
      desktop shortcut, it must mirror the visible icons and must not be the
      only way to reach an action.
- [x] Show the actions visibly in responsive card mode as well; do not assume a
      table-only Actions column covers mobile cards.
- [x] Give every icon button a translated accessible name, tooltip, keyboard
      focus state, disabled/pending state, and danger styling where applicable.
- [x] Verify the action group remains visible without clipping or horizontal
      overlap at supported desktop and mobile widths.

## 7. Navigation and Localization

- [x] Change the operator/admin contribution sidebar destination from
      `/operator/contributions` to `/contribution`.
- [x] Add the same `/contribution` destination to the family sidebar with the
      existing Contributions label and `HandCoins` icon, placed with the family
      finance or household destinations.
- [x] Do not add operator or family path segments to the canonical route.
- [x] Ensure active-route highlighting works for the new route.
- [x] Add family-specific page title, subtitle, empty-state, details, tooltip,
      and error copy in English, French, Arabic, and Spanish.
- [x] Reuse existing neutral status and action translations where their meaning
      is identical; do not display operator wording to the family.
- [x] Verify Arabic RTL ordering for the new action column, filter row, details
      dialog, and pagination controls.

## 8. Tests and Acceptance Evidence for the Later Implementation

### Backend tests

- [x] Family role receives `read:contributions` and no contribution write
      permissions.
- [x] Admin, operator, and family can call the shared read URL, with the correct
      projection selected from the authenticated exact role.
- [x] A family can list its own contributions with status and pagination.
- [x] A family cannot read another family's contribution by query manipulation
      or direct ID.
- [x] The serialized family response contains no sponsor name, image, gender,
      email, phone, payment method, actor IDs, or private operational metadata.
- [x] Sponsor and operator endpoints retain their current projections and
      behavior.
- [x] Family attempts against record/validate/reject/refund/delete endpoints
      are denied.
- [x] MCP discovery exposes the role-aware read and no family write ability.

### Frontend tests

- [x] Admin/operator and family navigation both contain `/contribution`.
- [x] No rendered `/operator/contributions` or `/family/contributions` page
      remains.
- [x] The canonical route uses the one shared Contributions feature and exact
      role dispatch.
- [x] Family table, cards, filters, and details contain no sponsor identity,
      sponsor contact, or payment method UI.
- [x] Family mode does not request operator family/sponsor filter data.
- [x] The row and card actions are visible icon buttons and no ellipsis action
      trigger is rendered.
- [x] Family mode exposes View only; operator/admin status actions remain
      correct.
- [x] Loading, empty, error, pagination, responsive cards, and RTL behavior are
      covered.

### Browser workflow

- [x] Sign in as an operator and open `/contribution`; confirm the complete
      management page and visible status-appropriate icon actions.
- [x] Sign in as a family with contribution history and open `/contribution`
      from the sidebar.
- [x] Confirm only that family's records are shown.
- [x] Confirm sponsor identity/contact and payment method are absent from the
      table, cards, details dialog, accessible text, and network response.
- [x] Confirm View is a visible icon and opens the safe details dialog.
- [x] Confirm there is no three-dot action button and no mutation UI.
- [x] Attempt direct navigation/API calls to operator contribution actions and
      confirm denial.
- [x] Confirm the old role-prefixed URLs do not host duplicate page logic and
      either redirect to `/contribution` or are unavailable as deliberately
      chosen during implementation.
- [x] Repeat the visual check at desktop, narrow mobile, and Arabic RTL widths.

## 9. Later Implementation Gate

When implementation is explicitly requested, run focused tests while working,
then close with the repository gate required by `AGENTS.md`:

```text
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

Expected migration result: no schema change and no generated migration. Record
exact command results and browser evidence in this plan and synchronize the
completed slice with `docs/PLAN.md`.

No build, lint, typecheck, tests, browser checks, or migration commands are part
of this planning-only task.

## 10. New Task — Compact Orders Mobile Cards

Status: **COMPLETE — implemented and validated 2026-08-02**

Improve the existing canonical `/orders` page on mobile without creating
role-specific order card copies. Keep `OrdersPage` and `OrderCard` shared across
admin/operator, family, and sponsor scopes, but pass exact-role presentation
eligibility into the shared card.

### 10.1 Locked mobile-card behavior

- [x] Make Orders cards materially more compact on narrow screens: reduce
      unused padding and vertical gaps, keep the order number, amount, and
      status visually dominant, and avoid repeating the same total in both the
      card header and an information row.
- [x] In **family scope only**, hide the family's phone, family name/avatar, and
      delivery address from the mobile card. These are redundant details for a
      family viewing its own account.
- [x] Hide the **Source** row from mobile/card view for **all roles**, including
      Assisted and Self-service values. This requirement applies to the shared
      card renderer; it must not depend on whether a particular role currently
      receives `placementSource` or `assisted`.
- [x] Show the assigned delivery person's name in mobile/card view for **all
      roles**: admin, operator, family, and sponsor.
- [x] Show the order's dominant (most-used) category as a compact avatar for
      **all roles**, following the Family Dashboard recent-orders visual:
      protected category image when available and a `ShoppingBag` fallback.
- [x] Define dominant category exactly like the existing Family Dashboard:
      highest sum of `orderItems.quantity`; break ties by the earliest order
      item creation time, then category ID, so every surface chooses the same
      result deterministically.
- [x] When no delivery is assigned, show the existing localized Not assigned
      state; when the latest attempt failed or was cancelled, preserve the
      localized Needs reassignment state where the role may see it.
- [x] Keep family Track and pending Cancel actions visible and compact. Preserve
      all existing status/authorization rules and pending mutation states.
- [x] Keep management actions and sponsor read-only behavior unchanged; this is
      a presentation/projection refinement, not a lifecycle redesign.
- [x] Do not remove fields from desktop table columns or detailed sheets unless
      a later task explicitly requests that. These visibility rules target the
      responsive mobile cards.

### 10.2 Shared frontend implementation

- [x] Refactor `apps/web/src/features/Orders/components/OrderCard.tsx` to accept
      an explicit card audience/scope (`management`, `family`, or `sponsor`) or
      equivalent presentation configuration from `OrdersPage`.
- [x] Keep one shared `OrderCard`; do not introduce `FamilyOrderCard`,
      `OperatorOrderCard`, or `SponsorOrderCard` copies.
- [x] Remove the Source row from the shared card for every audience.
- [x] Suppress guardian/family avatar, guardian/family name, family phone, and
      delivery address when the audience is `family`. Do not rely only on
      missing data because the current family projection contains these fields.
- [x] Resolve a single display-ready delivery name per scope:
      management from `currentDelivery` or the relevant `latestDelivery`,
      family from `deliveryName`, and sponsor from the new privacy-safe sponsor
      field.
- [x] Add `dominantCategoryName` and `dominantCategoryImage` to the shared card
      display contract and map them from every order-list scope.
- [x] Render the dominant category at the start of the compact card header with
      Najm Kit's verified avatar/media primitive, `ProtectedImage`, an
      accessible category-name label, and a `ShoppingBag` fallback when no
      category image exists. Match the Family Dashboard's approximately 48 px
      visual scale without copying its raw markup into a second component.
- [x] Keep the category avatar compact and non-cropping where appropriate; it
      must not push the order number, amount, or status out of the mobile header.
- [x] Keep the compact information rows limited to high-value mobile data:
      delivery person, article count, final/requested amount only when it adds
      information beyond the header total, and placed date.
- [x] Use the verified Najm Kit responsive density/class-name contracts to
      tighten the card header, information section, icons, and action section
      while retaining readable touch targets and semantic design tokens.
- [x] Keep card actions on one compact wrapping row where possible. They must
      remain keyboard accessible, translated, and easy to tap.
- [x] Ensure the final card can scroll fully above the mobile pagination bar;
      the paginator must not cover card content or actions as shown in the
      supplied screenshot.
- [x] Replace hard-coded OrderCard labels with existing or new en/fr/ar/es
      translations and verify Arabic RTL ordering.

### 10.3 Backend projection needed for all-role delivery names

- [x] Keep the existing management delivery summaries and family
      `deliveryName` list projection.
- [x] Extend the sponsor-supported order list projection with only the
      privacy-safe delivery display data needed by the card, preferably the
      latest relevant `deliveryNameSnapshot` plus a safe delivery-attempt
      status.
- [x] Do not expose delivery phone, staff profile ID, family phone/address,
      guardian identity, evidence paths, internal notes, or actor IDs to the
      sponsor response.
- [x] Batch-load latest delivery attempts for sponsor order IDs to avoid one
      delivery query per card; retain current ownership through active sponsor
      support assignments.
- [x] Update `SponsorSupportedOrder`, `FamilyOrder`, and shared card types so
      each audience maps explicitly to the shared display contract.
- [x] Move or extract the Family Dashboard's dominant-category selection into a
      feature-owned reusable order query/helper, then reuse it for dashboard
      recent orders and `/orders` list projections. Do not maintain two
      different definitions of "most used category."
- [x] Batch-load one dominant category per listed order ID for management,
      family, and sponsor scopes; avoid per-card/N+1 category queries.
- [x] Return only `dominantCategoryName` and `dominantCategoryImage` in the
      role-appropriate list projections. Do not expose product IDs, private
      family data, or unrelated catalog-management fields.
- [x] Permit sponsor principals to read protected **category image files only**
      when those images are included in their privacy-safe supported-order
      cards. Do not grant sponsor catalog-management or product-image access.
- [x] Update the category-image guard tests to prove admin/operator/family and
      sponsor can load the category avatar while unauthenticated callers remain
      denied.
- [x] No schema change or migration is expected; delivery name snapshots
      already exist and dominant category is derived from existing order items,
      products, and categories.

### 10.4 Tests and acceptance evidence

- [x] Add frontend tests proving OrderCard remains shared and Source is absent
      from every mobile/card audience.
- [x] Add frontend tests proving family cards omit family name/avatar, phone,
      and address while management cards retain their operational fields.
- [x] Add frontend tests proving delivery name or the correct localized fallback
      appears for management, family, and sponsor cards.
- [x] Add frontend tests proving every audience renders the dominant category
      image with category-name accessible text and uses the `ShoppingBag`
      fallback when the image/category is absent.
- [x] Add repository tests for quantity-based dominant-category ranking and the
      deterministic earliest-item/category-ID tie breaks, reusing the Family
      Dashboard contract.
- [x] Add backend tests proving sponsor order projections include the safe
      delivery name/status and exclude delivery phone, staff ID, family
      identity/contact/address, internal notes, and evidence fields.
- [x] Add backend projection tests proving management, family, and sponsor list
      rows include only the dominant category name/image fields expected by the
      card.
- [x] Confirm table-mode columns and order detail sheets retain their existing
      role-appropriate data and actions.
- [x] Browser-check `/orders` at approximately 375 px, 390 px, and 430 px for an
      operator, family, and sponsor with assigned and unassigned deliveries.
- [x] Confirm cards are visibly shorter, important rows do not wrap
      unnecessarily, actions remain tappable, and the last card is not hidden
      behind pagination.
- [x] Visually confirm the dominant category avatar matches the Family
      Dashboard recent-order treatment and remains aligned at each tested mobile
      width.
- [x] Repeat the mobile browser check in Arabic RTL.

## 11. New Task — Compact 12-Month Mobile Order Chart

Status: **COMPLETE — implemented and validated 2026-08-02**

Make the Family Dashboard **Order activity — last 12 months** bar chart fit
inside its mobile card without an internal horizontal scrollbar or page-level
horizontal overflow. Preserve the complete 12-month history.

### 11.1 Locked responsive behavior

- [x] Keep all 12 chronological month points on mobile. Do not reduce the chart
      to six/eight months, hide alternate months, paginate the chart, or require
      horizontal swiping.
- [x] Remove the mobile horizontal scrollbar created by the current
      `overflow-x-auto` and `min-w-[42rem]` combination in
      `MonthlyBarChart`.
- [x] Fit the chart to the available card width with 12 equal, shrinkable month
      columns using `min-w-0`/responsive grid sizing.
- [x] Keep every month label readable using the existing localized short month
      formatter or an equally clear compact label. Do not silently omit labels.
- [x] Keep non-zero bars distinguishable at narrow widths and retain a visible
      minimum marker for zero/tiny values.
- [x] Preserve the shared maximum-value scaling, series color, accessible value
      labels, and full screen-reader summary.
- [x] Compact the legend spacing and chart height on mobile when necessary,
      while retaining the current desktop proportions at larger breakpoints.
- [x] Ensure the chart card itself remains `min-w-0`, never widens the dashboard
      grid/page, and does not clip its title, legend, bars, labels, or border.

### 11.2 Shared frontend implementation

- [x] Update only the shared
      `apps/web/src/features/Dashboard/shared/DashboardCharts.tsx`
      `MonthlyBarChart` implementation; do not create a family-only duplicate.
- [x] Replace the fixed-width scrolling wrapper with a width-constrained,
      overflow-safe chart container.
- [x] Use responsive gaps, bar maximum widths, label font sizing, and chart
      height so 12 columns fit at approximately 320–430 px viewport widths.
- [x] Keep bar hit/hover/touch targets usable and retain each bar's translated
      accessible name/value even when the visible bar is narrow.
- [x] Preserve correct month order and alignment in English, French, Arabic RTL,
      and Spanish.
- [x] Keep `MonthlyLineChart` and unrelated dashboard cards unchanged unless a
      shared wrapper correction is required to prevent page overflow.
- [x] No backend, API, query, schema, or migration change is expected.

### 11.3 Tests and visual acceptance

- [x] Update focused chart tests to reject `overflow-x-auto` and
      `min-w-[42rem]` in `MonthlyBarChart`.
- [x] Add a test proving all 12 supplied months and labels remain rendered.
- [x] Add a layout contract proving the chart uses 12 shrinkable columns inside
      a `w-full min-w-0` container.
- [x] Browser-check the Family Dashboard at approximately 320 px, 375 px,
      390 px, and 430 px viewport widths using a full 12-month dataset with
      large, small, and zero values.
- [x] Confirm there is no chart scrollbar, no page-level horizontal scrollbar,
      no clipped February/last month, and no overlapping labels or bars.
- [x] Repeat the mobile check in Arabic RTL and confirm all 12 months remain
      visible and correctly ordered.
- [x] Confirm the desktop chart remains visually balanced and still shows the
      complete 12-month series.

## 12. Additional Tasks to Append

- [x] Add a shared OTP input to
      `C:\Users\hdevlop\Desktop\najm\packages\najm-kit`, based on the
      shadcn Base UI
      [`Input OTP`](https://ui.shadcn.com/docs/components/base/input-otp).
- [x] Export the standalone OTP input through Najm Kit's public package API.
- [x] Add `otp` as a supported `NForm` field type with the same validation,
      label, description, required, disabled, and error-message integration as
      existing form fields.
- [x] Preserve accessible keyboard navigation, full-code paste, focus,
      invalid, disabled, and one-time-code autofill behavior.
- [x] Add Najm Kit tests and a playground/documentation example for both the
      standalone component and its `NForm` usage.
- [x] Publish the updated Najm Kit package, verify the packed public exports and
      declarations, then upgrade Kafil to the released version before using
      the OTP field in application forms.

## 13. New Task - Sponsor Email OTP Verification During Login

Status: **COMPLETE — implemented and validated 2026-08-02**

Replace sponsor activation links with a short-lived email OTP. This is an
account-activation step for pending, unverified sponsors only; it is not MFA on
every login. After successful activation, later sponsor logins keep the normal
email-and-password flow.

This task depends on Section 12: Kafil must consume the published Najm Kit OTP
component and `NForm` field type instead of building a local OTP input.

### 13.1 Locked user flow

- [x] Public sponsor registration creates one pending, unverified sponsor and
      emails a six-digit activation code instead of a clickable verification
      link.
- [x] A repeated registration with the same case-insensitive email reuses the
      existing pending, unverified sponsor, rotates the code, and sends the new
      code; it must not create a duplicate user or sponsor profile.
- [x] An already-active email is never reset to pending and never receives an
      activation code through the registration-reuse path.
- [x] The registration result tells the sponsor that a code was sent and asks
      them to sign in with the email and password they just registered.
- [x] When those credentials are correct but the sponsor is still pending and
      unverified, login creates only a purpose-bound verification browser
      session and returns an explicit `sponsor_email_otp` next step. It must not
      create access, refresh, or normal signed-session cookies.
- [x] The login form routes that next step to `/verify-email`, which is
      repurposed as the OTP-entry page and no longer consumes a token from the
      URL.
- [x] Direct access to `/verify-email` without the valid purpose-bound browser
      session redirects to `/login`, matching the family password-setup route.
- [x] A correct, unexpired code atomically consumes the challenge, marks the
      sponsor email verified, activates the account, establishes the requested
      normal login session, and continues to the safe post-login destination.
      The sponsor does not need to enter the password a second time.
- [x] Preserve the original Remember me choice through the server-owned
      verification context so the final normal session has the requested
      browser-session or persistent lifetime.
- [x] The OTP page includes resend and cancel/sign-out actions. Resend rotates
      the code subject to a cooldown; cancel revokes the verification context
      and returns to login.
- [x] Expired, consumed, superseded, malformed, or repeatedly incorrect codes
      never activate the account and show one safe localized recovery message.
- [x] Family first-password setup, active sponsor login, operator/admin login,
      reset-password, and Google OAuth behavior remain separate and unchanged.

### 13.2 Najm Auth and backend contract

- [x] Keep password verification, lockout counters, sessions, and cookies owned
      by `najm-auth`. Do not copy password-hash comparison or session issuance
      into Kafil.
- [x] Add or verify a narrow Najm Auth credential-check contract for a
      purpose-bound setup flow that may return a correctly authenticated
      pending/unverified user without establishing a normal session. Ordinary
      `verifyCredentials`/login must continue rejecting inactive or unverified
      accounts.
- [x] Reuse Najm Auth `CredentialSetupService` with a distinct purpose and
      HttpOnly browser-session cookie for sponsor email verification, separate
      from the family password-setup purpose and cookie.
- [x] Change the access login result from the current boolean-only setup signal
      to an explicit discriminated next-step contract covering normal login,
      family password setup, and sponsor email OTP verification.
- [x] Replace the URL-token email template with a concise localized OTP email
      containing the code, its expiry, and a warning not to share it. Never put
      the code in a URL.
- [x] Store only a keyed hash of the OTP, never the plaintext code. Do not emit
      the code in logs, audit metadata, outbox metadata, API responses, or error
      messages.
- [x] Use one active challenge per sponsor. Issuing or resending a code revokes
      every previous unused code, and confirmation consumes the current code
      exactly once with a concurrency-safe database command.
- [x] Use a short expiry (10 minutes), bounded verification attempts, resend
      cooldown, and rate limits by both identity and IP. Exhausting attempts
      revokes the current challenge and requires a new code.
- [x] Keep registration/resend responses generic enough to avoid account
      enumeration. A pending-sponsor login may expose the OTP next step only
      after the password has been verified successfully.
- [x] Add an append-only migration for the OTP challenge fields/table and
      retire the deployed link-token behavior without editing migration `0014`.
      Existing unconsumed links may be invalidated by this migration; those
      users recover by signing in and requesting a new OTP.
- [x] Remove the old token-query confirmation endpoint and link-generation path
      after the OTP flow is active. Keep email-delivery failure recoverable via
      the login OTP page and its rate-limited resend command.

### 13.3 Frontend implementation

- [x] Update `LoginForm` and `getPostLoginRoute` to dispatch the explicit
      server-owned next step without inferring account status in the browser.
- [x] Replace `VerifyEmailForm` with a verification-session-aware OTP form that
      first checks the scoped session, then renders Najm Kit `NForm` with
      `FormInput type="otp"`.
- [x] Configure the OTP input for six numeric digits, one-time-code autofill,
      complete-code paste, validation errors, disabled/loading state, and
      accessible focus/error announcements.
- [x] Show only a masked destination hint from the server-owned verification
      context; do not place the full email or user ID in URL parameters or
      client-persisted state.
- [x] Add localized title, instructions, expiry, resend cooldown, error,
      success, cancel, and delivery-failure copy in English, French, Arabic,
      and Spanish, including RTL verification.
- [x] Use full-document navigation after OTP confirmation changes auth cookies,
      consistent with the stable login and family setup flows.
- [x] Update sponsor registration confirmation UI from activation-link wording
      to activation-code and sign-in wording. Remove the old link-specific UI
      and API client calls.

### 13.4 Tests and acceptance evidence

- [x] Backend tests cover new registration, case-insensitive repeated
      registration, active-email refusal, correct credential routing, wrong
      password denial, code rotation, expiry, attempt exhaustion, resend
      cooldown, atomic single consumption, and concurrent confirmations.
- [x] Cookie tests prove pending login creates only the scoped OTP cookie and no
      normal access, refresh, or signed-session cookie before confirmation.
- [x] Tests prove successful confirmation activates only the scoped sponsor,
      consumes both the OTP and verification session, applies Remember me, and
      cannot be replayed.
- [x] Security tests prove generic resend responses, rate-limit buckets, masked
      destination data, and absence of plaintext OTPs from responses, logs,
      audit events, outbox rows, and persisted challenge records.
- [x] Frontend tests cover all login next steps, guarded `/verify-email`
      access, six-digit OTP submission, paste/autofill, resend cooldown, cancel,
      expiry recovery, translated errors, and full-document navigation.
- [x] Browser-check the complete flow for a new sponsor and a repeated pending
      registration, then confirm the activated sponsor reaches `/dashboard`
      and later logs in normally without seeing the OTP page.
- [x] Run the full repository gate, PostgreSQL integration tests, append-only
      migration verification, and browser checks before marking this task
      complete.

## 14. Completion Evidence — 2026-08-02

- Canonical `/contribution` is shared by admin, operator, and family; family
  reads are owner-filtered and use a dedicated privacy projection. Visible
  icon actions replace the contribution ellipsis menu.
- The shared `OrderCard` now supports management, family, and sponsor audiences,
  displays batched delivery and dominant-category summaries, and avoids
  sponsor-list N+1 reads. Family cards omit family identity and contact data.
- The shared 12-month bar chart uses 12 shrinkable columns with no horizontal
  scrolling at 320, 375, 390, or 430 pixels, including Arabic RTL.
- Published `najm-kit@2.1.47` adds the standalone and `NForm` OTP input;
  published `najm-auth@2.0.13` adds purpose-bound pending-credential checks and
  shared credential-setup ownership.
- Migration `0032_same_rachel_grey.sql` adds one hashed sponsor OTP challenge
  per user with expiry, resend cooldown, attempts, remembered-session intent,
  delivery outcome, and atomic consumption metadata.
- `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build`
  passed. The current suites contain 259 web tests, 329 server tests plus 39
  opt-in skips, and 79 seed tests.
- `bun run test:db` passed 23/23 PostgreSQL integration and concurrency tests.
  `bun run db:migrate` applied the append-only migration and the final
  `bun run db:generate` reported no schema changes.
- Focused Chrome acceptance passed the canonical family contribution surface,
  compact order cards at 375/390/430 pixels plus RTL, the 12-month chart at
  320/375/390/430 pixels plus RTL, and the complete new-sponsor OTP activation
  flow. The temporary browser users and OTP sponsor were removed afterward.
