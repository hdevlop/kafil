# Family Create Form — Three-Step End-to-End Plan

## 1. Objective

Redesign the operator family-creation workflow from two crowded steps into
three focused steps:

1. `Guardian`
2. `Household`
3. `Initial children`

This is not a frontend-only rearrangement. The slice includes:

- database schema and a new migration;
- backend DTOs, repository selection, create/update services, and tests;
- web API types, create/edit forms, details UI, translations, and tests;
- deterministic demo data produced by `packages/seed`;
- realistic F8 development form-fill data, also produced through
  `packages/seed`;
- privacy verification so new internal household data never leaks to sponsors,
  audit metadata, logs, or outbox payloads.

The existing account provisioning, initial-password result, funding activation,
image upload, initial-children creation, and family lifecycle contracts must
remain unchanged.

## 2. Locked product decisions

### New stored fields

Add these fields to `family_profiles`:

| TypeScript field | PostgreSQL column | Type | Required for new records | Meaning |
| --- | --- | --- | --- | --- |
| `housingSituation` | `housing_situation` | enum | Yes | Current household housing arrangement |
| `registrationDate` | `registration_date` | date | Yes | Programme registration date selected by the operator |
| `supportPriority` | `support_priority` | enum | Yes | Operator assessment for operational prioritisation |

### Housing values

Use stable language-neutral values:

- `owned`
- `rented`
- `hosted`
- `temporary`
- `unknown`

`unknown` exists for migrated historical records only. The create form must not
offer it. The edit/details UI may display it as `Not recorded` until an operator
chooses a real value.

### Support-priority values

Use:

- `normal`
- `high`
- `urgent`

Priority is informational in this slice. It must not automatically:

- activate or deactivate a family;
- alter the funding target;
- approve an order;
- change sponsor assignment behavior;
- bypass any backend authorization rule.

Any later workflow or SLA based on priority requires a separate business-rule
decision.

### Registration date rules

- Required when creating a new family.
- Defaults in the UI to today's date in the user's local timezone.
- Must be a valid ISO date.
- Must not be in the future.
- It is separate from the server-owned `createdAt` timestamp.
- Updating it is allowed for correcting imported or operator-entered records.

## 3. Final wizard layout

### Step 1 — Guardian

Use a compact image picker followed by three explicit two-column rows:

| Row | Left | Right |
| --- | --- | --- |
| Image | Compact avatar/preview and upload action | Optional short upload guidance |
| 1 | Guardian name | Guardian CIN |
| 2 | Email | Guardian date of birth |
| 3 | Relationship to children | Household phone |

#### Guardian layout rules

- Replace the current full-width `h-52` upload drop zone with a compact,
  visually bounded avatar uploader.
- Recommended preview size: 96–128 px.
- Keep accepted image types and the existing 5 MB validation.
- Keep image upload outside the JSON payload: upload the file first, submit the
  returned managed path, and delete the uploaded file if family creation fails.
- Guardian name, CIN, email, date of birth, and phone remain required.
- Relationship remains optional.
- Do not reintroduce a second guardian/legal-name field. Continue deriving
  `guardianLegalName` from the account-holder `name`.

### Step 2 — Household

Use exactly these three responsive rows:

| Row | Left | Right |
| --- | --- | --- |
| 1 | Housing situation | Registration date |
| 2 | Support priority level | Activation target (MAD) |
| 3 | Internal family notes | Household exact address |

#### Household layout rules

- Desktop: two equal columns.
- Mobile: one column in the same logical reading order.
- Notes and address use equal-height textareas.
- Exact address remains required.
- Notes remain optional.
- Activation target remains a positive MAD amount in the UI and integer minor
  units in the API/database.
- Select controls must show translated labels while submitting stable enum
  values.
- Do not add all household fields to the family list table; that would recreate
  the visual overload. Show them in create, edit, and operator details.

### Step 3 — Initial children

- Keep the existing repeatable child editor and child field contract.
- Allow 0–20 initial children, matching the backend DTO.
- Empty state must clearly say children can be added later.
- Preserve every entered guardian and household value when moving backward.
- Final submission creates the family and all initial children in the existing
  family transaction.
- Keep the initial-credentials result after successful creation.

## 4. Wizard behavior and validation

Configure three `WizardForm` steps:

### `guardian`

Validate only:

- `name`
- `guardianCin`
- `email`
- `guardianDateOfBirth`
- `relationshipToChildren`
- `phone`

Image errors remain external to the Zod form and block submission when present.

### `household`

Validate only:

- `housingSituation`
- `registrationDate`
- `supportPriority`
- `activationTargetMad`
- `notes`
- `exactAddress`

### `initial-children`

Validate:

- `initialChildren`

### Navigation requirements

- `Next` validates only the active step.
- `Previous` never discards values or selected image state.
- Final submission validates the complete schema.
- Submission buttons are disabled during image upload or family creation.
- API errors leave the user on the form with their values intact.
- The dialog footer stays visible, but ordinary desktop use of steps 1 and 2
  should not require internal scrolling.
- F8 refills the complete three-step form, resets the image file/error as it
  does today, and remounts the wizard with valid generated values.

## 5. Database implementation

### Enum definitions

Add PostgreSQL enums in `packages/server/src/database/enums.ts`:

- `family_housing_situation`
- `family_support_priority`

Export and compose them through the existing database schema entrypoint.

### Family schema

Update `packages/server/src/modules/families/familySchema.ts` with:

- `housingSituation`
- `registrationDate`
- `supportPriority`

Keep `createdAt` and `updatedAt` unchanged.

### Migration strategy

Generate a new migration with `bun run db:generate`. Never edit a deployed
migration.

The migration must safely handle existing families:

1. Create both enum types.
2. Add the three columns as nullable or with safe temporary defaults.
3. Backfill:
   - `housing_situation = 'unknown'`;
   - `support_priority = 'normal'`;
   - `registration_date` from the existing `created_at` date using an explicit
     Casablanca timezone conversion rather than relying on the database
     session timezone.
4. Apply `NOT NULL`.
5. Keep a database default of `normal` for support priority if desired.
6. Do not use a database default that silently labels new housing data
   `unknown`; new API requests must provide a real housing value.
7. Record any Drizzle rename/create prompt decision in the implementation
   evidence.

### Migration verification

- Run the migration against the local PostgreSQL database.
- Confirm historical families receive honest backfills.
- Confirm a new family cannot persist invalid enum values.
- Confirm `registration_date` is a date and does not replace `created_at`.
- Run `bun run db:generate` again after implementation and verify there is no
  unexpected schema drift.

## 6. Backend contract implementation

### DTOs

Update `packages/server/src/modules/families/familyDto.ts`.

Create:

- `housingSituation`: required enum excluding `unknown`;
- `registrationDate`: required ISO date with a non-future validation rule;
- `supportPriority`: required enum.

Update:

- accept all stored housing values so an old `unknown` record can be read and
  corrected;
- when `housingSituation` is submitted during update, reject `unknown` as a new
  operator choice;
- accept optional `registrationDate` and `supportPriority`;
- apply the same non-future registration-date validation.

Keep existing CIN normalization, phone validation, address limits, notes
limits, money validation, image-path validation, and child limits.

### Repository

Update `packages/server/src/modules/families/familyRepository.ts`:

- add all three fields to `familySelection`;
- add all three fields to `NewFamilyProfile` create data;
- allow all three fields in the typed update pick;
- ensure list, get, create, update, and `findByUserId` return consistent family
  records.

Do not add these fields to sponsor-safe selections in
`supportAssignmentRepository.ts`.

### Service

Update `packages/server/src/modules/families/familyService.ts`:

- destructure and persist all three fields during create;
- forward them through update;
- keep family user provisioning and initial-password generation unchanged;
- keep budget creation and initial-child creation in the same transaction;
- keep funding-target activation behavior unchanged;
- do not let priority mutate lifecycle or balances.

### Audit behavior

- `family.created` may include non-sensitive operational facts such as
  `supportPriority` and child count.
- Do not put exact address, internal notes, CIN, date of birth, phone, or
  housing situation into audit/outbox metadata.
- For updates, record changed field names rather than sensitive old/new values.
- Preserve the dedicated funding-target audit event and minor-unit values.

### Authorization and privacy

- Create/update/details remain operator/admin management operations.
- Permanent deletion remains bootstrap-admin-only.
- Family and sponsor authorization remains backend-owned.
- Sponsor-supported-family responses must not expose:
  - housing situation;
  - registration date;
  - support priority;
  - notes;
  - exact address;
  - CIN, phone, email, or guardian date of birth.

## 7. Web contract and form implementation

### Types and API mapping

Update:

- `apps/web/src/features/Families/types.ts`
- `apps/web/src/features/Families/config/familySchemas.ts`
- `apps/web/src/services/familyApi.ts` if explicit mapping changes are needed

Add shared frontend union types for housing and support priority. Extend:

- `FamilyRecord`
- `CreateFamilyInput`
- `UpdateFamilyInput`
- `CreateFamilyFormValues`
- `UpdateFamilyFormValues`

`toCreateFamilyInput()` and `toUpdateFamilyInput()` must:

- pass stable enum values unchanged;
- pass `registrationDate` as `YYYY-MM-DD`;
- keep MAD-to-minor-unit conversion unchanged;
- keep optional strings normalized to `null`;
- never derive registration date from the browser timestamp at mapping time;
  it must come from the validated form value.

### Create defaults

`createFamilyDefaultValues()` must set:

- `housingSituation: ""` so the operator makes an explicit choice;
- `registrationDate` to today's local `YYYY-MM-DD`;
- `supportPriority: "normal"`;
- existing text and child defaults as before.

Do not use `toISOString().slice(0, 10)` for the local default near midnight,
because UTC can produce the wrong local date. Add or reuse a local-date helper.

### Components

Refactor `FamilyForms.tsx` into bounded components:

- `FamilyGuardianFields`
- `FamilyHouseholdFields`
- `FamilyChildrenFields`

Keep shared create/edit fields reusable. The update form should group Guardian
and Household sections consistently even if it remains a single submit form.

### Operator details

Update `FamilyDetails.tsx` to show:

- housing situation;
- registration date;
- support priority.

Display priority with a restrained semantic treatment:

- normal: neutral;
- high: warning;
- urgent: destructive emphasis.

This display is informational and must not imply an automatic lifecycle action.

### Family cards and table

- Do not add three new permanent columns.
- Optionally show priority only when `high` or `urgent`.
- Keep exact address and notes out of cards.
- Filtering/sorting by priority can be a later slice unless the backend list
  query is deliberately extended here.

## 8. Translation work

Update `apps/web/src/i18n/translations.ts` for every supported language.

Add keys for:

- Guardian step;
- Household step;
- housing situation label and all values;
- registration date label and future-date error;
- support priority label and all values;
- `Not recorded`;
- optional helper text explaining priority is an operator assessment;
- children-can-be-added-later empty state.

Do not hardcode English enum labels inside components.

## 9. Demo seed data

Demo fixtures and browser F8 fill are related but distinct:

- `packages/seed/src/scripts/demo/generator.ts` produces persistent database
  fixtures for `bun run seed -- demo`.
- `packages/seed/src/fakers/form-fill.ts` produces schema-shaped browser form
  values used by F8 through `apps/web/src/lib/devFormFill.ts`.

Both must be updated.

### Persistent demo generator

Update `DemoFamily` with:

- `housingSituation`
- `registrationDate`
- `supportPriority`

Update the `family()` generator and pass it the existing `referenceDate` so
registration dates are deterministic relative to the requested demo snapshot.

Generate realistic distributions:

#### Housing

- 25% owned
- 40% rented
- 25% hosted
- 10% temporary
- 0% unknown for newly generated demo families

#### Priority

- 50% normal
- 35% high
- 15% urgent

#### Registration dates

- dates within the previous 24 months;
- never future dates;
- stable for the fixed Faker seed and supplied reference date;
- varied enough for reporting demonstrations.

Keep Moroccan-friendly names, CINs, phone numbers, addresses, funding targets,
children, images, and contribution distributions unchanged.

### Demo seed persistence and verification

- Existing `FamilyService.create()` must receive the generated fields.
- Repair/idempotency behavior must remain safe on repeated demo seed runs.
- Extend post-seed verification to select the three columns and confirm every
  generated family matches the requested fixture.
- Never make demo seeding part of production deployment or automatic migration.

### Demo generator tests

Extend `packages/seed/test/demo-generator.test.ts` to verify:

- every `DemoFamily` passes `createFamilyDto`;
- every generated housing value is allowed and never `unknown`;
- every priority value is allowed;
- registration dates are valid, non-future, and within the chosen window;
- repeated generation with the same seed/reference date is deterministic;
- expected distribution counts are correct for a sufficiently large fixture;
- zero-family and small-family counts remain valid without division or indexing
  errors.

Extend seed integration/verification tests where they already inspect stored
family and child records.

## 10. F8 runtime form fill

F8 currently calls:

`FamilyForms.tsx` → `devFormTools(createFamilyFormSchema)` →
`@kafil/seed/fakers` → `buildFormFill()`.

Preserve that shared architecture.

### Shared form faker

Update `packages/seed/src/fakers/form-fill.ts`:

- enum schemas already choose an allowed enum value; retain that behavior for
  housing and priority;
- add explicit `registrationDate` handling before the generic birth-date
  branch;
- generate a recent date within the past 24 months;
- never generate a future registration date;
- keep `guardianDateOfBirth` as an adult birth date;
- keep child dates as child birth dates;
- continue generating Moroccan addresses, phones, CINs, names, relationships,
  notes, and activation targets.

This ordering is required. Without a `registrationDate` special case, the
generic date logic will incorrectly generate it as an adult birth date.

### Family-specific F8 values

Update `createFamilyDefaultValues()` and `createFamilyDevFillValues()`:

- include all three new fields;
- generate only create-valid housing values, excluding `unknown`;
- generate normal/high/urgent priority values;
- generate a recent registration date;
- continue generating 1–4 initial children for F8;
- parse the final generated object through `createFamilyFormSchema`;
- clear the selected image because browser code cannot create a genuine local
  uploaded file safely;
- fill all three steps in one F8 press;
- preserve the current wizard remount so generated values appear immediately.

### F8 tests

Extend `packages/seed/test/form-fill.test.ts`:

- housing and priority values come from their Zod enums;
- registration date is recent and non-future;
- guardian and child birth dates retain correct age ranges;
- generated family values pass the complete web form schema or an equivalent
  shared schema fixture.

Extend the web Families tests to verify:

- F8 values contain all three new fields;
- the wizard receives valid defaults;
- F8 does not populate `unknown`;
- 1–4 child records are generated;
- F8 remains disabled by default until an operator or admin enables the
  persisted platform setting.

## 11. Backend and web test matrix

### Server unit/contract tests

- Create accepts every valid housing and priority value.
- Create rejects missing and invalid values.
- Create rejects future registration dates.
- Update persists corrections.
- Existing migrated `unknown` housing can be returned.
- Update cannot deliberately set housing back to `unknown`.
- Repository projections include the fields for operators.
- Sponsor-safe projections exclude all three fields.
- Audit metadata contains no sensitive household values.

### Database integration

- Migration backfill is correct.
- Create persists exact values.
- Update persists exact values.
- Transaction rollback still removes provisioned family/children if a later
  operation fails.
- Permanent family deletion removes the family graph with the new columns
  requiring no special cleanup.

### Web tests

- Three step labels render.
- Each Next action validates only its own fields.
- Back/Next preserves values.
- Desktop rows are structurally paired as specified.
- Mobile layout collapses to one column.
- Create mapping produces minor units and the three new fields.
- Update mapping preserves them.
- Operator details render translated labels.
- No sponsor component receives the new private fields.

## 12. Implementation order

1. Add enum/schema definitions and update backend DTO types.
2. Generate and inspect the migration.
3. Update repository selections and create/update services.
4. Add backend tests and privacy/audit assertions.
5. Update persistent demo generator, seed verification, and seed tests.
6. Update web types, schemas, mappings, translations, and defaults.
7. Split the form into Guardian, Household, and Initial children steps.
8. Update edit and operator details views.
9. Update the shared F8 faker and family-specific F8 generation.
10. Add focused web/F8 tests.
11. Apply the migration locally and run the full verification gate.
12. Update `docs/PLAN.md` and the relevant section plan with actual evidence,
    migration name, and final command results.

## 13. Verification commands

Run focused checks while implementing:

```bash
bun run --cwd packages/server typecheck
bun run --cwd packages/server test
bun run --cwd packages/seed typecheck
bun run --cwd packages/seed test
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
```

Run the required final gate:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

Run database integration when PostgreSQL is available:

```bash
bun run db:migrate
bun run test:db
```

Exercise both fake-data paths:

```bash
bun run seed -- demo --families=20 --contributions=0
```

Then open the family-create dialog in development and press F8 to verify the
complete three-step browser fill independently from persistent demo seeding.

## 14. Acceptance criteria

- The family-create dialog has exactly three clear steps.
- Guardian and Household steps fit the ordinary desktop dialog without
  unnecessary internal scrolling.
- The compact image picker no longer dominates the first step.
- The six Household fields appear in the exact requested row pairings.
- Housing situation, registration date, and support priority persist through
  create and update.
- Historical family rows migrate without invented housing facts.
- Demo seed families contain realistic deterministic values for all new fields.
- F8 produces valid values for all three steps, including 1–4 children.
- Registration date is never confused with a guardian birth date.
- Operator details show the new data; sponsor projections do not.
- Priority remains informational and does not change financial or lifecycle
  invariants.
- Full lint, typecheck, test, build, migration generation, and applicable DB
  integration gates pass.
