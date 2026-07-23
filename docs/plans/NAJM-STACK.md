# Kafil Najm and Next.js Contract

This document records the installed contracts the implementation plan relies
on. Re-check package versions and their installed documentation before changing
these assumptions.

## Current Runtime

- Bun workspace
- Next.js `16.2.10`
- React `19.2.4`
- `najm-auth` `2.0.3`
- `najm-core` `2.0.4`
- `najm-database` `2.0.3`
- `najm-i18n` `2.0.2`
- `najm-mcp` `2.0.2`
- `najm-validation` `2.0.2`
- `najm-kit` `2.1.23`
- Drizzle ORM `0.45.2`
- PostgreSQL

## API Hosting

`apps/web/src/app/api/[...route]/route.ts` imports `server` from
`@kafil/server` and exports Najm's `handle(server)` adapter for the supported
HTTP methods.

Keep:

- Node.js runtime
- dynamic API behavior
- one `/api` base path
- one web/API process
- `.load(moduleObject)` behavior for the bundled Next.js environment

Route Handlers are public endpoints. Every domain controller must enforce its
own validation and authorization.

## Authentication

Use `najm-auth` for:

- public registration and login
- refresh token rotation and revocation
- password reset and activation
- users, roles, and permissions
- role and permission guards
- ownership policies
- server and React auth clients

Kafil-specific account services may call:

- `AuthService.provisionUser()` to create an operator-managed login and link its
  returned `userId` to a domain profile
- `UserService.update()` for allowed account/profile updates
- Najm user status for activation/deactivation

`provisionUser()` supports both branches Kafil needs. Operator accounts keep the
email invitation behavior when no password is provided. Operator-created family
and sponsor accounts receive a generated initial password; Kafil returns it once
to the authorized operator and persists only Najm's hash. Phone-to-user mapping,
phone-or-email login, and public sponsor email activation live in Kafil's small
`access` module because `najm-auth@2.0.3` publishes phone storage but its login
DTO remains email-only and it has no verification endpoint.

`najm-email@2.0.2` is registered directly before auth. Local development uses
the console provider; production selects a provider through environment
variables. Public sponsor registration is pending until a hashed, expiring,
one-time verification token is confirmed.

The public registration role is fixed by `auth({ defaultRole })`. The MVP will
set it to `sponsor`; family and operator roles remain provisioned workflows.

## Authorization

Use:

- `defineRoles()` for `ADMIN`, `OPERATOR`, `FAMILY`, and `SPONSOR`
- `admin` as the only super-role
- permission guards for broad operation capability
- ownership policies for family and sponsor row isolation
- explicit service validation for cross-table rules and state transitions

Client-side role checks are display helpers only. Secure checks remain in the
Najm backend.

## Next.js Application Rules

- Route groups organize auth, landing, and dashboard sections without changing
  URLs.
- Pages and layouts remain Server Components by default.
- Client Components are limited to forms, dialogs, cart interaction, and other
  browser state.
- Server-rendered reads use a server-only application client and forwarded
  session context; avoid a public self-HTTP round trip where the same data can
  be read safely from the server layer.
- Browser mutations use the authenticated API client.
- Do not import server secrets or database modules into Client Components.

## UI Library

Use `najm-kit` and the existing Tailwind v4 theme integration for forms,
tables, dialogs, badges, status feedback, cards, and dashboard layout.

## Future Direct Dependencies

Add a package as a direct dependency only when its phase implements it:

- `najm-storage` for protected uploads and delivery/payment evidence
- `najm-cache` plus Redis for production revocation and distributed limits
- `najm-event` for in-process reactions only

Do not use an in-process event as the sole record of a required financial or
notification action. Commit a database record/outbox event first.
