# Family edit wizard plan (v2 — implementation-ready)

Status: **READY FOR IMPLEMENTATION — not implemented or accepted**

This is a task-specific root plan. It does not replace any other plan and
claims no project-wide phase status. There is no root `PLAN.md`.

## 1. Goal

Fix the `Edit Karima Iraqi` dialog shown in the reported screenshot. Today it
renders all guardian and household fields in one tall page with no usable
internal scrollbar, so the lower fields (`monthly budget`, `notes`, exact
address, and coordinates) are cut off.

Bring edit to parity with the create flow while retaining edit-specific scope:

- use a 2-step wizard: `guardian` → `household`;
- keep `initial-children` create-only;
- use a bounded `width: "xxl", height: "xl"` dialog;
- make the active wizard step internally scrollable while the footer remains
  reachable;
- remove the three dead order-policy inputs from edit because the family update
  request does not save them.

Out of scope: changing family creation behavior, children management, the
`FamilyOrderPolicyCard` editor, backend DTO/service/schema changes,
`najm-theme`, publication, and deployment.

### Implementation preflight

The current worktree contains user-owned, uncommitted changes in the same family
files, including coordinate support. Preserve and layer on those changes. Do
not restore these files from `HEAD`, discard unrelated edits, or edit generated
`packages/server/dist` output.

Before implementation, re-read the mandatory Kafil frontend skill and the
Playwright skill. The backend skill is required only to verify that the
existing update contract remains unchanged. No Next.js route, layout, caching,
or server/client-boundary change is planned; if that scope changes, read the
relevant installed Next.js 16 guide before coding.

## 2. Current state and installed contracts (verified)

- `CreateFamilyDialog.tsx` uses `WizardForm` with three steps,
  `showSectionHeader={false}`, a bounded dialog, and a `NajmScroll` only around
  the children step.
- `UpdateFamilyDialog.tsx` uses a plain `NForm` that stacks
  `FamilyGuardianFields`, `FamilyHouseholdFields`, and a submit button.
- `useFamiliesPageDialogs.tsx` opens create with
  `width: "xxl", height: "xl"`, but opens edit with
  `size: "xxl", height: "auto"`.
- `GuardianFields.tsx` and `HouseholdFields.tsx` render their own
  `NFormSectionHeader` by default. The wizard header should own the step title.
- `HouseholdFields.tsx` always renders `maxOrdersPerMonthInput`,
  `maxBudgetPerOrderMadInput`, and `monthlyBudgetMadInput`.
- Edit supplies no defaults for those policy fields, `toUpdateFamilyInput()`
  does not return them, and `updateFamilyDto` does not accept them. Policy edits
  are owned by `PUT /api/budgets/:familyProfileId/order-policy` and
  `FamilyOrderPolicyCard`.
- `updateHouseholdFieldsSchema` permits the stored legacy value `unknown` and
  includes a `superRefine(validateCoordinatePair)` check.
- Installed `najm-kit@2.11.19` confirms `DialogWidth` contains `xxl`,
  `DialogHeight` contains `xl`, and `WizardForm` supports `classNames` and
  `devTools`.
- Installed `WizardForm` already gives its step form
  `min-h-0 flex-1 overflow-y-auto`. A consumer `overflow-y-hidden` class wins
  through `cn`/Tailwind merging and disables that scroll path.
- With installed `zod@4.4.3`, `.omit()` throws when called on an object schema
  that already contains refinements. Zod object schemas strip unknown keys by
  default; they do not reject them unless made strict.
- The existing locale catalogs already contain `guardianStep`,
  `householdStep`, `householdStepDescription`, `next`, `previous`, `saving`,
  and `saveProfile` for `en`, `fr`, `ar`, and `es`.

## 3. Locked design

### 3.1 Edit wizard and scrolling

Replace the update dialog's `NForm` with a two-step `WizardForm`:

```text
steps = [
  guardian: fields [name, guardianCin, email, guardianDateOfBirth,
              relationshipToChildren, phone],
            schema = createFamilyGuardianStepSchema,
            render = <FamilyGuardianFields showSectionHeader={false} ... />
  household: fields [housingSituation, registrationDate, supportPriority,
              activationTargetMad, notes, exactAddress,
              deliveryLatitudeInput, deliveryLongitudeInput],
            schema = updateFamilyHouseholdStepSchema,
            render = <FamilyHouseholdFields showSectionHeader={false}
                      showPolicyFields={false} ... />
]

<div className="h-full min-h-0" aria-busy={isSubmitting}>
  <WizardForm
    steps={steps}
    schema={updateFamilyFormSchema}
    defaultValues={editDefaultsWithoutPolicyFields}
    nextLabel={...}
    previousLabel={...}
    submitLabel={...}
    className={isSubmitting ? "pointer-events-none select-none" : undefined}
    classNames={{
      root: "h-full min-h-0",
      step: "min-h-0 flex-1 pb-4",
      footer: "sticky bottom-0 z-10 bg-background/95 pt-3"
    }}
  />
</div>
```

Do **not** put `overflow-y-hidden` on `classNames.step`: it overrides
`WizardForm`'s installed `overflow-y-auto` and recreates the clipping bug. Do
not add a nested `NajmScroll` unless browser evidence proves the installed
scroll viewport is insufficient. There must be exactly one vertical scroll
owner for the active edit step.

Keep image upload/removal behavior and `await pop()` after success unchanged.
Derive one `isSubmitting = update.isPending || isUploadingImage` value for
field disabling, `aria-busy`, the pending label, and interaction styling.

Because `WizardForm` does not expose disabled footer-button props and
`pointer-events-none` does not block keyboard activation, protect
`handleSubmit` with an immediate ref-based in-flight guard as well. Set the
guard before upload/update work, ignore a duplicate submission, and release it
in `finally`. This prevents duplicate PUT/upload operations from repeated
Enter/Space activation.

### 3.2 Dialog sizing

Change only edit dialog sizing to:

```text
width: "xxl", height: "xl", showButtons: false
```

Remove `size: "xxl", height: "auto"`. On small viewports Najm's dialog remains
full-height; at `lg` and above `xl` resolves to the installed bounded-height
variant.

### 3.3 No-policy update schema

Add an exported `updateFamilyHouseholdStepSchema` containing only:

```text
housingSituation, registrationDate, supportPriority, activationTargetMad,
notes, exactAddress, deliveryLatitudeInput, deliveryLongitudeInput
```

Do not call `.omit()` on the already-refined
`updateHouseholdFieldsSchema`—Zod 4.4.3 throws at module evaluation. Build or
derive an unrefined update household base/shape first, omit the three policy
keys there, then apply `.superRefine(validateCoordinatePair)` to the resulting
step schema. Compose `updateFamilyFormSchema` from the guardian shape and the
no-policy household shape, then apply the coordinate-pair refinement to the
full schema as well.

Keep normal Zod strip-unknown behavior. Do not make the update schema strict:
existing family schema tests deliberately expect unrelated keys such as
`initialChildren` to be stripped. The contract is that dead policy keys are
absent from parsed update values and cannot leak into `toUpdateFamilyInput`, not
that parsing an object containing an unknown key must fail.

Add `showPolicyFields?: boolean` to `FamilyHouseholdFields`, defaulting to
`true`. Keep the three policy inputs unchanged for create; pass `false` from
edit. `toUpdateFamilyInput` and all backend family/budget contracts remain
unchanged. Keep `activationTargetMad`: it is a family-profile field, not an
order-policy field.

### 3.4 Localization, RTL, and accessibility

Reuse the existing translation keys; no locale edits are expected. The edit
wizard must provide:

- keyboard activation for Next, Previous, and Save;
- focus on the first invalid field after validation;
- a sensible focus target after a successful step transition;
- visible focus indicators;
- announced validation messages;
- an accurate busy state and duplicate-submit protection;
- usable layout and scroll direction under Arabic RTL.

If `WizardForm` cannot provide transition focus after its installed contract is
inspected in the implementation environment, fix that at the reusable Najm
boundary or record a narrowly justified exception; do not add an unrelated
Kafil-only wizard.

## 4. Implementation tasks (`apps/web` only)

1. `features/Families/config/familySchemas.ts`
   - introduce an unrefined household base/shape suitable for safe selection;
   - export `updateFamilyHouseholdStepSchema` without policy fields and with the
     coordinate-pair refinement;
   - rebuild `updateFamilyFormSchema` from guardian plus no-policy household
     fields, retaining the full-form coordinate refinement;
   - preserve normal strip-unknown behavior.
2. `features/Families/components/FamilyForms/HouseholdFields.tsx`
   - add `showPolicyFields?: boolean` with default `true`;
   - conditionally render the three policy `FormInput`s as one group;
   - leave create behavior unchanged.
3. `features/Families/components/FamilyForms/UpdateFamilyDialog.tsx`
   - replace `NForm` and the hand-wired submit button with `WizardForm`;
   - define the exact two step configurations above;
   - pass `showSectionHeader={false}` to both field groups and
     `showPolicyFields={false}` to household fields;
   - use edit defaults without policy keys;
   - preserve coordinate defaults and all image behavior already present in
     the worktree;
   - use the installed scroll behavior and add the in-flight submission guard.
4. `features/Families/hooks/useFamiliesPageDialogs.tsx`
   - change edit to `width: "xxl", height: "xl"`.
5. Tests and runner
   - extend focused source tests as specified below;
   - add the dedicated real-API browser spec to the explicit default file list
     in `apps/web/scripts/run-phase6-e2e.ts`;
   - reconcile the stale household-field-count assertion in
     `family-create-wizard.e2e.ts`; prefer assertions by visible field label and
     responsive row position over a brittle total child count.

Do not modify backend source, migrations, locale catalogs, family creation
payload behavior, or the budget policy endpoint for this slice. If current
contracts make that impossible, stop and amend this plan rather than silently
expanding scope.

## 5. Tests and acceptance

### 5.1 Focused source tests

Extend `apps/web/test/phase6-families-feature.test.ts` or add one narrowly named
family-wizard source test that proves:

- `updateFamilyHouseholdStepSchema` accepts stored `unknown` housing;
- lone latitude or longitude is rejected and a valid pair is accepted;
- parsed update values strip all three policy keys;
- `updateFamilyFormSchema` still strips `initialChildren`;
- `toUpdateFamilyInput` contains no policy fields and retains all legitimate
  family-profile fields, including activation target and coordinates;
- the edit wizard registers exactly the guardian fields on step 1 and the
  no-policy household fields on step 2;
- edit dialog configuration is `width: "xxl", height: "xl"`;
- the pending/in-flight guard is present and the edit step does not override
  vertical overflow to hidden.

Keep tests behavioral where practical. If a source assertion is necessary for
configuration wiring, make it narrow and avoid duplicating the component.

### 5.2 Dedicated real-PostgreSQL browser spec

Add `apps/web/test/e2e/family-edit-wizard.e2e.ts`. Do not extend
`family-create-wizard.e2e.ts` for acceptance because that existing spec uses
`page.route()` family API mocks.

Use the runner-owned app on `127.0.0.1:3210`, the Phase 6 operator/admin users,
real browser requests, and real PostgreSQL:

1. Attach deny-all diagnostics immediately to every page: page errors, console
   errors, failed requests, and unexpected `4xx`/`5xx` responses.
2. In setup, use an authenticated operator context and the real
   `POST /api/families` contract to create a uniquely named disposable family
   with generated email, phone, CIN, and valid household data. Do not use
   `page.route()`, direct SQL mutation, or log generated identity values.
3. In `finally`, use a separate authenticated admin context and the real
   `DELETE /api/families/:id` contract to clean up the disposable empty family.
   Assert cleanup succeeded; never leave credentials or identity values in
   evidence.

The affected spec must prove:

- desktop operator flow: open edit from `/family`, assert the dialog box lies
  within viewport bounds and the document itself does not become the scroll
  owner;
- step 1: only guardian fields are present, invalid Next focuses/announces the
  first invalid field, and valid values survive Previous/Next navigation;
- step 2: policy inputs are absent; `scrollHeight > clientHeight` on the actual
  wizard step viewport when overflow is required; changing `scrollTop` exposes
  notes, address, latitude, and longitude while the footer remains visible;
- save: register the exact successful `PUT /api/families/:id` observer before
  activation, activate Save twice rapidly (including keyboard activation), and
  prove only one PUT occurs;
- persistence: reopen the edited family or refetch its detail and assert the
  changed legitimate fields, not merely a success toast;
- create regression: after closing edit, open create and assert the three
  policy labels remain visible without submitting the create form;
- mobile Arabic RTL flow at approximately `390 × 844`: dialog remains within
  viewport bounds, the household step scrolls internally, footer actions stay
  reachable, focus is visible, and keyboard-only Previous/Next works using the
  Arabic accessible names.

Use stable role/label/test-id selectors and resolve visible desktop/mobile
duplicates explicitly. Avoid arbitrary sleeps, `.first()` as an ambiguity fix,
forced clicks, mocks, and `networkidle`. Record only masked/value-free evidence.

### 5.3 Browser execution order

Run the desktop work unit with passive diagnostics first (focused cost):

```powershell
$env:KAFIL_E2E_FILES='test/e2e/family-edit-wizard.e2e.ts'
$env:KAFIL_E2E_GREP='family edit wizard persists profile changes on desktop'
bun run --cwd apps/web test:e2e
Remove-Item Env:KAFIL_E2E_GREP -ErrorAction SilentlyContinue
Remove-Item Env:KAFIL_E2E_FILES -ErrorAction SilentlyContinue
```

After it passes, run the complete affected spec (complete-spec cost):

```powershell
$env:KAFIL_E2E_FILES='test/e2e/family-edit-wizard.e2e.ts'
bun run --cwd apps/web test:e2e
Remove-Item Env:KAFIL_E2E_FILES -ErrorAction SilentlyContinue
```

Then run the same affected spec against a controlled production build
(final-gate cost):

```powershell
$env:NAJM_NEXT_DIST_DIR='.next-phase6-e2e'
bun run build
$env:KAFIL_E2E_USE_PRODUCTION='1'
$env:KAFIL_E2E_FILES='test/e2e/family-edit-wizard.e2e.ts'
bun run --cwd apps/web test:e2e
Remove-Item Env:KAFIL_E2E_FILES -ErrorAction SilentlyContinue
Remove-Item Env:KAFIL_E2E_USE_PRODUCTION -ErrorAction SilentlyContinue
Remove-Item Env:NAJM_NEXT_DIST_DIR -ErrorAction SilentlyContinue
```

Before each browser invocation, perform the runner's read-only preflight:
authorized PostgreSQL target reachable, port `3210` free, required secrets
present without printing values, and live email delivery disabled. Promote to
the next level only after a native exit-code-zero pass. On failure, inspect the
artifact and server evidence, classify it, fix the smallest owning layer, and
rerun only the focused work unit once before expanding.

## 6. Verification gates

Run focused checks while implementing:

```powershell
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run build
```

Then run the required repository gate sequentially from the root:

```powershell
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

This is a frontend-only slice. Capture `git status --short` before and after
`db:generate`; it must create no migration attributable to this slice. The
worktree already contains unrelated migration/schema work, so do not mistake
pre-existing files for wizard-generated drift and do not alter them.

Store sanitized screenshots and the acceptance mapping under a dated
`docs/evidence/family-edit-wizard/` directory. Report these independently:

1. implementation/source gates;
2. real-PostgreSQL browser acceptance;
3. production-style local browser acceptance;
4. schema-drift result;
5. Git publication — not requested;
6. deployment — out of scope and not performed.

Do not mark the plan complete from source inspection or a passing test command
alone. Every checked browser requirement must map to a concrete UI, network,
diagnostic, or persistence assertion.

## 7. Locked decisions

- [x] Edit is a 2-step wizard; `initial-children` remains create-only.
- [x] Edit hides the three order-policy inputs; policy changes remain in
  `FamilyOrderPolicyCard` and its budgets-owned endpoint.
- [x] Edit uses `width: "xxl", height: "xl"`.
- [x] The active step uses WizardForm's installed `overflow-y-auto`; edit does
  not copy create's `overflow-y-hidden` override.
- [x] Update schemas strip unknown keys; they do not become strict.
- [x] No chained order-policy mutation is added.
- [x] Backend, publication, and deployment remain out of scope.
