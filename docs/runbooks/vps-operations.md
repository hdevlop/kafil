# Kafil VPS operations

This runbook deploys the production-like **demo**. It is not authorization to
accept real financial or sensitive personal data. The application, migration,
PostgreSQL, Redis, and optional Caddy services are one Compose project named
`kafil`; there is no separate API service. Redis is retained as an optional
Compose profile and is not required until its application contract is wired.

## Audited host baseline (2026-07-22)

- Ubuntu 24.04.4 LTS, x86_64 KVM, 4 vCPU, 7.8 GiB RAM, no swap.
- Root filesystem: 145 GiB total, 102 GiB free.
- Docker 29.1.3 and Compose 2.40.3 are installed and running.
- Public IPv4 `213.136.64.28`; public IPv6 `2a02:c207:2325:5661::1`.
- Host Caddy owns TCP 80/443 and UDP 443 for `myscolai.com`.
- `doorfaceid-api` is an unrelated container bound only to `127.0.0.1:4000`.
- UFW is inactive. SSH listens on 22 and currently permits root and password
  login. Do not change either until provider-console recovery and a second SSH
  session have been confirmed.
- No Kafil data, Docker volumes, host PostgreSQL/Redis, offsite backup tooling,
  GitHub CLI, or deploy-capable GitHub authentication was found.

Preserve host Caddy, `myscolai.com`, the unrelated container and its bind
mounts, Ollama, and every unrelated service.

## Inputs and approval gates

Do not activate the stack until an operator supplies:

- demo hostname whose A/AAAA records resolve to this VPS;
- ACME/contact email;
- protected application, PostgreSQL, Redis, admin, and email credentials;
- an off-VPS restic repository and credentials;
- a dedicated `kafil-deploy` SSH public key and GitHub environment secrets;
- confirmation of provider recovery-console access and a second SSH session.

DNS changes, credential generation, SSH/firewall changes, and demo setup/seeds
require explicit approval. Demo fixture counts require separate approval.

## Bootstrap (manual, approved operation)

1. Confirm the expected repository revision and review the release bundle.
2. Create a non-root `kafil-deploy` account with key-only access. Docker socket
   access is effectively privileged; prefer a dedicated rootless Docker daemon
   or constrain deployment through an administrator-reviewed command wrapper.
   Do not disable current access until the recovery-console and second-session
   checks pass.
3. Create, without removing anything else:

   ```text
   /opt/kafil/env
   /opt/kafil/releases
   /opt/kafil/state
   /srv/kafil/storage-demo
   /srv/kafil/storage-production
   /var/backups/kafil
   ```

   The deploy account owns Kafil directories only. Environment files are mode
   `0600`; directories are `0750`. The storage directory must be writable by
   UID/GID used by the image's `bun` user.
4. Copy the two committed examples to protected VPS files:

   ```text
   deploy/env/app.env.example            -> /opt/kafil/env/app.env
   deploy/env/infrastructure.env.example -> /opt/kafil/env/infrastructure.env
   ```

   Replace every placeholder. Keep `NEXT_PUBLIC_FORM_FILL_ENABLED=false`.
   The database password embedded in `DATABASE_URL` must match the PostgreSQL
   password. Never copy a development `.env`.
5. Authenticate the VPS to GHCR with a dedicated `read:packages` credential if
   the image is private. Never place that token in the repository or image.
6. Upload the first reviewed release directory. Verify `release.sha256`, then:

   ```bash
   docker compose --env-file /opt/kafil/env/infrastructure.env \
     -f /opt/kafil/releases/<sha>/compose.production.yml config --quiet
   docker compose --env-file /opt/kafil/env/infrastructure.env \
     -f /opt/kafil/releases/<sha>/compose.production.yml up -d postgres
   ```

   Do not publish database or Redis ports.

## Existing host Caddy integration

This VPS must not start the Compose `edge` profile because host Caddy already
owns 80/443. Leave `COMPOSE_PROFILES` unset. Kafil binds only
`127.0.0.1:3300`; merge the reviewed `deploy/Caddyfile.host.example` site block
into `/etc/caddy/Caddyfile`, substituting the approved hostname.

Before reload:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Only perform this after DNS resolves and with explicit approval. Never replace
the existing `myscolai.com` block. A clean host on which Compose owns 80/443
may set `COMPOSE_PROFILES=edge` and use the pinned Caddy container instead.

## GitHub environment

Create the protected `demo-vps` environment restricted to `main`. Record the
server's SSH host key out of band before storing these environment secrets:

- `VPS_HOST`
- `VPS_PORT`
- `VPS_USER` (must be `kafil-deploy`)
- `VPS_SSH_PRIVATE_KEY`
- `VPS_KNOWN_HOSTS`

The workflow pins third-party actions to full commits, builds only after lint,
typecheck, tests, and production build pass, pushes
`ghcr.io/hdevlop/kafil:sha-<40-character-sha>`, and passes its digest to the
VPS. Deployment does not build source or seed data on the VPS.
The Next.js route collector requires auth and email configuration while
building; CI and the discarded Docker build stage use fixed, explicitly
non-secret `example.invalid`/build-only values. They are never production
credentials. The runtime reads the protected VPS environment.

## Deployment and rollback

Manual invocation uses the exact workflow-produced digest:

```bash
/opt/kafil/releases/<sha>/scripts/deployVps.sh \
  <sha> /opt/kafil/releases/<sha> sha256:<64-hex-digest>
```

The script locks deployment, validates checksums/Compose/Caddy, preserves the
current release and image, pulls and verifies the immutable image, applies
pending migrations, and only then recreates `app`. If migration fails, the old
app remains running. If readiness or HTTPS fails, the prior release and app
image are restored. Database migrations are not rolled back and therefore must
remain backward-compatible.

The last deployment record is `/opt/kafil/state/last-successful.txt`. Manual
rollback, when explicitly needed, uses its `rollback_release` and
`rollback_image`:

```bash
export KAFIL_IMAGE='<recorded rollback image>'
docker compose --env-file /opt/kafil/env/infrastructure.env \
  -f '<recorded rollback release>/compose.production.yml' \
  up -d --no-deps app
ln -sfn '<recorded rollback release>' /opt/kafil/current
/opt/kafil/current/scripts/verifyVpsDeployment.sh
```

Never use `docker compose down -v`. Do not claim schema rollback.

## Demo initialization (manual, one time)

Before any setup or demo command, prove the selected database is the new empty
demo target and has no valuable data; complete HTTPS, readiness, backup, and
isolated restore checks first. Then, only with explicit approval:

```bash
docker compose --env-file /opt/kafil/env/infrastructure.env \
  -f /opt/kafil/current/compose.production.yml --profile tools run --rm migrate
docker compose --env-file /opt/kafil/env/infrastructure.env \
  -f /opt/kafil/current/compose.production.yml --profile tools run --rm \
  migrate bun run seed -- setup --yes
docker compose --env-file /opt/kafil/env/infrastructure.env \
  -f /opt/kafil/current/compose.production.yml --profile tools run --rm \
  migrate bun run seed -- demo --families=<approved> --sponsors=<approved> \
  --operators=<approved> --contributions=<approved>
docker compose --env-file /opt/kafil/env/infrastructure.env \
  -f /opt/kafil/current/compose.production.yml --profile tools run --rm \
  migrate bun run seed -- verify
```

The `migrate` service name is reused only as an isolated one-shot image here;
the explicit command replaces its normal migration command. Never place these
seed commands in automatic deployment.

## Demo-to-production transition

Freeze deployments and retain the demo database/storage. Back both up, create
a new empty production database and `/srv/kafil/storage-production`, rotate
every application/admin/database/Redis/email/deployment secret, migrate the new
database, and seed only roles, permissions, and the real admin. Verify email,
authorization, reconciliation, browser flows, HTTPS, readiness, backup, and
restore before switching the production hostname. Deleting retained demo data
always requires later explicit approval; keep the seed package in source.
