---
name: kafil-najm-backend
description: Build, refactor, review, or test Kafil backend work in packages/server and packages/seed using installed Najm conventions. Use for controllers, DTOs, guards, services, repositories, Drizzle schemas or migrations, auth and permissions, MCP tools, storage, audit/outbox, financial commands, privacy projections, seed definitions, and database or concurrency tests. Require verified installed Najm contracts and feature-owned modules.
---

# Kafil Najm Backend

## Preflight

1. Read the root `AGENTS.md`, `docs/PLAN.md`, and the active implementation
   plan completely.
2. Inspect the current module from controller through tests before editing.
3. Verify the installed Najm versions and declarations under
   `packages/server/node_modules/` and `apps/web/node_modules/`.
4. Read package declarations/source for every decorator, guard, DI, transaction,
   storage, validation, or MCP contract that is not already proven in the
   current module. Do not implement remembered Najm APIs.
5. Inspect existing schema relationships and deployed migrations before
   proposing persistence changes.

## Follow the Najm Module Shape

Keep feature code under `packages/server/src/modules/<feature>/`:

```text
<feature>Controller.ts
<feature>Dto.ts
<feature>Guards.ts
<feature>Repository.ts
<feature>Schema.ts
<feature>Service.ts
<feature>Validator.ts
index.ts
```

- Keep `packages/server/src/database/schema.ts` composition-only.
- Keep controllers thin: decorators, validated input, authenticated context,
  response messages, and delegation.
- Put domain coordination and transactions in services.
- Put persistence queries in repositories.
- Put existence, ownership, transition, and conflict checks in validators when
  they are reusable domain rules.
- Use dependency injection through Najm/Diject. Do not manually construct
  service graphs inside controllers.
- Do not edit generated `packages/server/dist` files.

## Use Najm Contracts

- Use `najm-core` controller/parameter/response decorators.
- Use `najm-validation` with Zod DTOs at every input boundary.
- Use existing named Kafil guards and Najm policies/permissions.
- Use `najm-auth` for users, sessions, JWTs, ownership, RBAC, PBAC, account
  provisioning, and password flows. Never build a parallel auth or permission
  system.
- Use `najm-mcp` tool metadata for eligible commands and reads. Keep discovery
  tests synchronized.
- Use established Najm storage/email/cache/rate facilities where the current
  architecture already owns those concerns.
- When adding or changing a policy capability, update the controller policy,
  seed definitions, role grants, seed verification, and denial tests together.
- Treat admin as the explicit super-role included by Kafil guards. Do not assume
  admin has an operator, sponsor, or family domain profile.

## Command and Transaction Design

- Expose explicit commands such as `approve`, `reject`, `recordPurchase`, or
  `confirmDelivery`; never expose a generic status/balance mutation.
- Parse DTOs at the service boundary as defense in depth.
- Resolve ownership and actor attribution separately. Assisted orders belong to
  the selected family and retain the staff actor.
- Keep idempotency keys unique and validate an existing key against the same
  command context before returning it.
- Lock rows in a deterministic order. When inventory and budget both apply,
  lock inventory first and budget second.
- Perform balance changes, ledger append, domain mutation, audit, and durable
  outbox enqueue in the required transaction.
- Keep post-commit filesystem cleanup best-effort or durable; do not unlink
  protected files inside a database transaction.

## Financial and Privacy Invariants

- Store money as safe integer minor units in MAD. Reject floating-point money.
- Preserve `availableMinor >= 0`, `reservedMinor >= 0`, and `spentMinor >= 0`.
- Lock the budget account before mutation and append the immutable ledger entry
  in the same transaction.
- Recalculate product prices and order totals on the server.
- Keep validated financial records append-only; corrections use explicit
  reversal/refund records unless an audited admin-only deletion contract
  already permits otherwise.
- Never expose guardian CIN, exact address, documents, protected evidence, or
  private operational notes to sponsor/public projections, audit metadata,
  outbox payloads, or logs.
- Treat family self-service, operator management, sponsor-supported views, and
  public data as separate projections even when frontend pages are shared.

## Schema and Migrations

- Use camelCase TypeScript identifiers and snake_case PostgreSQL names.
- Generate a new migration after schema changes. Never edit a deployed
  migration.
- Run `bun run db:generate` and review every generated statement and Drizzle
  prompt.
- Record rename/create decisions and prove they preserve data.
- Add schema, migration-content, repository, service, and real PostgreSQL tests
  proportional to risk.
- If a frontend-only task unexpectedly generates a migration, stop and inspect
  schema drift rather than accepting it.

## Tests and Evidence

- Test DTO boundaries, allowed and forbidden roles, ownership, privacy
  projections, idempotency, transitions, audit/outbox metadata, and errors.
- Add real database tests for locking, concurrency, foreign keys, rollback, or
  financial invariants when mocks cannot prove the behavior.
- Remember that server tests compile into `dist` before running; edit source and
  tests only.
- Keep MCP discovery expectations and seed authorization tests synchronized.

Run focused validation while iterating:

```text
bun run --cwd packages/server typecheck
bun run --cwd packages/server test
bun run --cwd packages/seed test
```

Run `bun run test:db` for database/concurrency changes. Close the slice with the
full root gate from `AGENTS.md`, including `db:generate`, and report exact
commands and results. If the user explicitly forbids a validation command, do
not run it and report that evidence as unperformed.
