# Applicant Creation Plan

Status: **PROPOSED - documentation only**

Parent workflow: [`SPONSOR-WORKFLOW.md`](../../SPONSOR-WORKFLOW.md)

Roadmap relationship: this is the bounded frontend-and-backend plan for the
public sponsor journey from **Become a sponsor** through verified
`pending_review`. It does not authorize implementation or change the active
status of [`docs/PLAN.md`](../PLAN.md). Admin review, activation,
authentication, and the sponsor workspace remain in the parent workflow.

## 1. Outcome and boundary

A visitor can submit one complete, context-free application, verify the
email with the existing Najm OTP contract, and reach a pending-admin-review
screen without receiving an authenticated session.

This plan owns:

- the public **Become a sponsor** CTA and `/apply` experience;
- applicant form validation and localized UI states;
- applicant persistence and its pending Najm authentication identity;
- email-verification setup, resend, and confirmation;
- duplicate email/phone handling; and
- the transition from `pending_email_verification` to `pending_review`.

It does not own admin approval/rejection, post-approval login, sponsor workspace
access, support assignments, or contribution pages.

## 2. Product and security rules

- The CTA carries no family ID, bookmark, return-to-family value, local-storage
  state, cookie state, or hidden support intent.
- Registration creates an applicant, not an active sponsor session.
- Email OTP proves control of the email only; it never activates the account.
- No public request accepts or stores a family ID.
- Approval creates no assignment because approval is outside this plan.
- Public responses must avoid account enumeration.
- Passwords, sessions, users, roles, and verification challenges remain owned
  by Najm Auth. Kafil must not create a parallel auth system.
- An applicant is not a sponsor entity. Registration must not create a
  `sponsor_profiles` row, sponsor workspace identity, or support assignment.
- OTP values remain hashed, purpose-bound, and absent from responses, logs,
  audit metadata, and outbox payloads.

## 3. Applicant lifecycle

```text
pending_email_verification -> pending_review
```

| Application state | User status | Email verified | May authenticate? |
| --- | --- | --- | --- |
| `pending_email_verification` | `pending` | No | No |
| `pending_review` | `pending` | Yes | No |

Repeated submissions must behave as follows:

- match email case-insensitively and phone after Moroccan normalization;
- reuse an unverified pending application and resend a bounded OTP challenge;
- return the pending-review outcome for a verified application without making
  a duplicate;
- direct an already approved account to sign in;
- deny duplicate creation for a rejected applicant; and
- require any future rejected-application reopen to be an explicit audited
  admin workflow in the parent plan.

## 4. Backend plan

### Data model

Add a feature-owned `applicants` table. It is the pre-approval domain root and
must not be named or modeled as a sponsor profile or sponsor application:

```text
id
auth_user_id                  unique, references pending auth user
name
email
phone
cin
gender
address
date_of_birth
status                        pending_email_verification | pending_review |
                              approved | rejected
submitted_at
reviewed_at                   nullable
reviewed_by_user_id           nullable, references auth user
rejection_reason              nullable
created_at
updated_at
```

The applicant contains no family ID. Its private review fields remain on the
feature-owned `applicants` record until approval. There is no `sponsor_profiles`
record before approval.

Database constraints must enforce:

- one applicant per auth user;
- reviewer and review timestamp for terminal decisions;
- a rejection reason only for rejected applicants;
- no rejection reason for approved applications; and
- valid status/review-field combinations.

Compose the new schema from `packages/server/src/database/schema.ts`, generate
a new Drizzle migration, and never edit an existing migration.

### Transaction and service behavior

Submission must atomically create or reuse:

- one pending Najm auth user reserved for the applicant;
- one complete applicant record; and
- one active email-verification challenge.

The pending auth record is credential infrastructure only. It does not make the
applicant a sponsor domain entity and must not grant sponsor capabilities.

Registration begins the purpose-bound OTP setup session and returns
`nextStep: "applicant_email_otp"`. The applicant must not attempt a login to
receive or complete the first verification.

Successful OTP confirmation changes only:

```text
emailVerified = true
applicant.status = pending_review
user.status = pending
```

It creates no access token, refresh token, normal session, support assignment,
or sponsor workspace access.

### API surface

```http
POST /api/applicants
GET  /api/applicants/email-verification/setup
POST /api/applicants/email-verification/resend
POST /api/applicants/email-verification/confirm
```

### Feature ownership

```text
packages/server/src/modules/applicants/
  applicantController.ts
  applicantDto.ts
  applicantGuards.ts
  applicantRepository.ts
  applicantSchema.ts
  applicantService.ts
  applicantValidator.ts
  index.ts
```

- `access` owns registration coordination, email verification, and setup
  sessions;
- `applicants` owns pre-approval identity details and review state;
- `sponsors` begins ownership only when approval creates the sponsor profile;
  and
- Najm Auth owns credentials, users, role data, sessions, tokens, and OAuth.

## 5. Frontend plan

### Public CTA

- Replace public sponsor-support variants with one **Become a sponsor** action.
- Route directly to `/apply` without search parameters.
- Do not persist the visitor's current family or page.
- Use concise supporting copy: `Apply to become a verified Kafil sponsor.`

### Application form

Collect the complete review information before submission:

- name;
- email;
- phone;
- CIN;
- gender;
- address;
- date of birth;
- password and password confirmation; and
- required consent/terms acknowledgement only if Kafil already has an accepted
  terms contract.

Use installed Najm Kit form components and the shared `NForm type="otp"`
contract. Do not create a Kafil-local OTP control. Verify installed component
and auth contracts before implementation.

### UI state flow

The feature must render localized loading, validation, submission, OTP,
resend-cooldown, pending-review, duplicate-account, and generic error states.
Successful OTP confirmation renders the pending-review screen and must not
redirect to the dashboard.

Keep applicant UI in its own feature boundary. The public route remains thin
and imports the feature page:

```text
apps/web/src/app/(auth)/apply/page.tsx
  thin public route -> ApplicantPage

apps/web/src/features/Applicants/
  components/ApplicantPage.tsx
  components/ApplicantForm.tsx
  components/OtpStep.tsx
  components/PendingReview.tsx
  config/schemas.ts
  hooks/useApplicant.ts
  services/api.ts
  types.ts
  index.ts
```

The later admin queue and review UI also belongs to `features/Applicants`, but
its route, permissions, and decisions are implemented by the parent workflow.
Do not place applicant forms in `features/Auth` or `features/Sponsors`; those
features consume the resulting auth identity and approved sponsor only.
The feature directory already supplies context, so keep local component and
helper names concise instead of repeating redundant feature-name prefixes.

Before changing routes or client/server boundaries, read the relevant installed
Next.js 16 documentation under `apps/web/node_modules/next/dist/docs/`.

## 6. OTP acceptance

Preserve the current security contract:

- hashed six-digit code;
- 10-minute expiry;
- one active challenge;
- bounded attempts;
- resend cooldown;
- identity/IP rate limits;
- atomic single consumption;
- no plaintext OTP in responses, logs, audit metadata, or outbox payloads; and
- generic failure responses.

## 7. Implementation slices

### Slice A - backend applicant contract

- [ ] Add the `applicants` module and schema.
- [ ] Generate and review a new migration.
- [ ] Implement atomic create-or-reuse registration behavior.
- [ ] Add case-insensitive email and normalized-phone duplicate handling.
- [ ] Add state, constraint, DTO, repository, validator, and service tests.

Exit: Kafil persists one complete, reviewable applicant, with no sponsor profile
or family relationship.

### Slice B - frontend application and verification

- [ ] Reduce public sponsor actions to **Become a sponsor**.
- [ ] Remove family parameters and persistence from public onboarding.
- [ ] Collect and validate the complete applicant record.
- [ ] Create the dedicated `apps/web/src/features/Applicants` boundary and keep
      `/apply` as a thin route.
- [ ] Begin OTP setup during registration.
- [ ] Use the shared Najm OTP form contract.
- [ ] Change OTP confirmation to `pending_review` without creating a session.
- [ ] Add localized submitted, verification, pending-review, and error states.

Exit: a visitor can submit and verify an application but cannot authenticate.

## 8. Required tests

### Backend

- new application creates one pending auth identity and one complete applicant;
- registration creates no sponsor profile or sponsor capabilities;
- no applicant DTO, request, table, or response accepts a family ID;
- duplicate pending/unverified email reuses the applicant;
- normalized duplicate phone cannot create another identity;
- repeated verified submission returns pending review without duplication;
- OTP marks email verified and the application pending review without a
  session or tokens;
- OTP expiry, attempts, resend cooldown, and atomic consumption remain bounded;
- registration rollback leaves no partial auth-user/applicant graph; and
- audit/outbox/log payloads contain no private profile or credential data.

### Frontend

- public family and landing pages expose only **Become a sponsor**;
- registration carries no family context;
- applicant UI is owned by `features/Applicants`, not Auth or Sponsors;
- complete form validation covers every review field;
- the shared Najm OTP UI is used;
- OTP success renders pending review instead of navigating to the dashboard;
- duplicate and resend outcomes remain generic and localized; and
- loading, error, disabled, responsive, keyboard, and Arabic/RTL states work.

### Browser journeys

1. Visitor -> Become a sponsor -> complete form -> OTP -> pending review.
2. Repeat unverified application -> bounded resend -> OTP -> pending review.
3. Repeat verified application -> pending-review result with no duplicate.
4. Pending applicant -> login attempt -> no session or sponsor navigation.

## 9. Verification gate

- [ ] Run `bun run lint`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run test`.
- [ ] Run `bun run build`.
- [ ] Run `bun run db:generate` and confirm no unintended drift.
- [ ] Run `bun run test:db` for duplicate-submission and OTP concurrency.
- [ ] Complete browser acceptance in English, French, and Arabic/RTL.
- [ ] Synchronize accepted status and evidence into `docs/PLAN.md`, the parent
      sponsor workflow, and the relevant section plan.

## 10. Definition of done

- public onboarding has one context-free **Become a sponsor** action;
- the complete applicant record is persisted before review;
- OTP verifies email without activating or authenticating;
- a verified applicant ends in `pending_review` with a pending auth user;
- retries do not create duplicate identities, applicants, or OTP
  challenges;
- no visitor family/bookmark state or support assignment is created;
- privacy, security, migration, localization, responsive, and concurrency gates
  pass; and
- roadmap and parent-workflow documentation match verified evidence.

Deployment and production acceptance remain separate explicitly authorized
gates.

## 11. Explicit non-goals

- Admin approval, rejection, or applicant queue UI.
- Sponsor activation or authenticated sessions.
- Google OAuth or post-approval email/phone login.
- Sponsor dashboard, workspace, sidebar, or profile recovery.
- Visitor bookmarks or saved families.
- Passing a family from public pages into registration.
- Support-assignment or contribution creation.
- Child-target sponsorship.
- A new authentication system outside Najm Auth.
- Deployment or publication without separate authorization.
