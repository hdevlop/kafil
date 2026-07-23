# Kafil

Kafil is an accountability-first sponsorship platform. The repository is a Bun workspace with one Next.js runtime and separate backend and seed packages.

```text
apps/
  web/       Next.js landing, dashboard, and /api Route Handler
packages/
  server/    Najm controllers, services, repositories, and server configuration
  seed/      Najm role, permission, and fixture seeds
```

## Development

Install dependencies and start the single web runtime:

```bash
bun install
bun run dev
```

For phone testing over local HTTPS, keep using the root command so Kafil's
explicit `.env` loader remains active:

```bash
bun run dev:https
```

Opening `next dev --experimental-https` directly inside `apps/web` bypasses the
root `.env` loader and leaves required services such as email unconfigured.

While developing, open a dashboard data-entry form and press `F8` to fill it
with generated Moroccan-friendly test data. Set
`NEXT_PUBLIC_FORM_FILL_ENABLED=false` to disable this shortcut; production
builds disable it automatically.

Available routes:

- `http://localhost:3000/` — public landing route group.
- `http://localhost:3000/dashboard` — dashboard route group.
- `http://localhost:3000/api/system/health` — Najm health endpoint.

The API does not run on another port. `apps/web/src/app/api/[...route]/route.ts` imports the configured server from `packages/server` and exposes it through Najm's `handle(server)` adapter.

## Install on a phone

Deploy Kafil over HTTPS, then open it in the phone browser. On Android, choose
**Install app** from the browser menu. On iPhone, open Safari, tap **Share**, and
choose **Add to Home Screen**. The installed app opens in a standalone window.

The offline screen intentionally contains no family or financial data. API
responses and authenticated pages stay network-only and are never stored by the
service worker.

### Test the production build over local Wi-Fi

Build and expose the production server through the local HTTPS proxy:

```bash
bun run preview:https
```

Then open `https://192.168.1.13:3000` on a phone connected to the same Wi-Fi.
The proxy keeps Next.js private on `127.0.0.1:3001`, forwards the original HTTPS
host/protocol, and loads the root `.env`. `start:https` can be used without a
rebuild after the first successful `preview:https` run.

The ignored files `certificates/local-wifi.pem` and
`certificates/local-wifi-key.pem` must include the computer's current Wi-Fi IP.
To make Chrome treat the connection as fully trusted for service-worker/PWA
testing, install only the mkcert public root certificate
`%LOCALAPPDATA%\mkcert\rootCA.pem` on the phone. Never copy `rootCA-key.pem`.

## Account access and email

Login accepts an email address or a normalized phone number. Operator-created
family and sponsor accounts return a one-time initial credential for direct
handoff. Public sponsor registrations remain pending until the sponsor opens the
verification link sent by `najm-email`.

Login, sponsor registration, and verification requests use a hashed normalized
identity plus the client IP for rate-limit buckets. Production must keep session
recovery on the same Next.js process:

```env
NAJM_AUTH_INTERNAL_URL=http://127.0.0.1:3000/api/auth/session/recover
```

Newly operator-created families are guided to replace the temporary password on
their first login. That family-only replacement accepts an easy lowercase-letter
and number password; all other account and password flows keep Najm's stronger
password policy.

Local development can use `EMAIL_PROVIDER=console`. For production, set a real
provider such as Resend or SMTP together with `EMAIL_DEFAULT_FROM`; the complete
environment template is in `.env.example`.

## Verification

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Run every gate in sequence with:

```bash
bun run check
```

## Database and seed

`packages/seed` is a command package, not a server. Copy `.env.example` to `.env`, configure PostgreSQL and the bootstrap administrator, then run the migration:

```bash
bun run db:migrate
```

Generate a migration after intentional schema changes with `bun run db:generate`.

Open the seed CLI with:

```bash
bun run seed
```

The command requires `DATABASE_URL`, `KAFIL_ADMIN_EMAIL`, and
`KAFIL_ADMIN_PASSWORD`. Choose `setup` to apply migrations, clear application
data, and seed the Najm bootstrap administrator, product roles, and permissions.
For automation, run `bun run seed -- setup --yes`.

Seed repeatable demo data with 20 families, 50 sponsors, 5 operators, 50 active
support assignments, and 100 contributions:

```bash
bun run seed -- demo
```

The family fixtures include one to three children. Contributions use realistic
validated, pending, and rejected states and flow through the normal ledger and
funding services. Validated demo contributions are capped below each family's
funding target. Matching demo records are skipped on later runs, while outdated
managed demo contributions are safely repaired. Customize
the counts with SMS-style arguments such as
`bun run seed -- demo --families=10 --sponsors=25 --operators=3 --contributions=40`.
Contributions require at least one family and one
sponsor; use `--contributions=0` when intentionally seeding neither. To apply
migrations, seed authentication, and then seed demo data in one command, run
`bun run seed:full`.

Optional demo images live together in `packages/seed/images` as files such as
`family-01.jpg` and `sponsor-01.webp`. Run `bun run seed -- images` to validate
the library. The full organization and assignment rules are documented in
[`packages/seed/README.md`](packages/seed/README.md).

The active roadmap is [docs/PLAN.md](docs/PLAN.md), with the next implementation
slice in
[docs/plans/sections/07-reports-operations-and-release.md](docs/plans/sections/07-reports-operations-and-release.md).
