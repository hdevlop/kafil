# VPS Docker Deployment Plan

Status: **PROPOSED**

Audience: a coding model working from the Kafil repository and an external VPS.

## 1. Objective

Deploy Kafil as a production-like Docker stack on one VPS. The first public
deployment uses demo fixtures. Every accepted push to the deployment branch
must pass the repository gate, produce an immutable container image, update the
VPS, run pending migrations, and verify application health.

The later real-production launch must reuse the tested infrastructure but move
the application to a new clean database and storage location. It must not carry
demo users, sessions, uploads, or fixtures into real production.

This document is an implementation handoff. It does not authorize destructive
database, volume, storage, firewall, DNS, or certificate operations without the
user's explicit confirmation.

## 2. Fixed Kafil Contracts

- Use Bun `1.3.14` and Bun workspace commands. Do not introduce npm, Yarn, or
  pnpm.
- Kafil has one deployable application process: `apps/web` hosts the Next.js
  UI and imports `packages/server` for the API. Do not create a second API
  container.
- Build from the repository root so the workspace packages are available.
- Production starts with the existing root `bun run start` contract.
- Root build, start, and migration scripts explicitly load `.env`. The
  container must therefore mount the protected VPS application environment at
  the expected workspace-root `.env` path, or the implementation must update
  those scripts to accept an already-injected environment while preserving the
  documented local behavior. Prove the chosen contract in a container test.
- The application listens internally on port `3000`. Only the reverse proxy
  may publish host ports `80` and `443`.
- PostgreSQL money and order migrations are forward-only. Never edit an
  existing deployed migration.
- Persist PostgreSQL data and `KAFIL_STORAGE_PATH` outside the application
  image.
- Never run `seed:full`, `setup`, or `demo` from the automatic deployment
  workflow.
- Production secrets must not enter the Git repository, Docker build context,
  container image, Compose file, or GitHub Actions logs.
- The current `/api/system/health` route is liveness only. Add and use a
  database-aware readiness check before calling the stack production-ready.

## 3. Required Inputs

The model must obtain or discover these values before implementation. It must
not invent them:

| Input | Example placeholder |
| --- | --- |
| VPS distribution and version | `Ubuntu 24.04` |
| VPS public IP | `<VPS_IP>` |
| SSH port and non-root deploy user | `<SSH_PORT>`, `kafil-deploy` |
| GitHub owner and repository | `<OWNER>/<REPOSITORY>` |
| Deployment branch | `main` |
| Demo hostname | `demo.<DOMAIN>` |
| Real-production hostname | `app.<DOMAIN>` |
| GHCR image | `ghcr.io/<owner>/<repository>` |
| Email provider and sender | `<PROVIDER>`, `<FROM_ADDRESS>` |
| Backup destination | `<OFFSITE_BACKUP_TARGET>` |

The current local workspace snapshot is not recognized by `git rev-parse`, and
its `.git` directory appears incomplete. Before creating the workflow, verify
the authoritative GitHub repository, default branch, remote, and whether the
VPS should clone the repository at all. The recommended deployment does not
need a source checkout on the VPS; it pulls images from GHCR.

## 4. Target Architecture

```text
GitHub push to deployment branch
              |
              v
GitHub Actions: install -> lint -> typecheck -> test -> build
              |
              v
Build immutable image tagged with Git commit SHA -> push to GHCR
              |
              v
SSH to the restricted VPS deploy account
              |
              v
Pull image -> run migration job -> replace app -> readiness check
              |
              v
Caddy :443 -> Kafil app :3000 -> PostgreSQL + Redis
                              -> persistent private storage
```

Use one Compose project named `kafil`. Its services are:

- `app`: the single Kafil Next.js application image.
- `migrate`: a one-shot service using the same release image and environment.
- `postgres`: a pinned PostgreSQL major version with a persistent volume and
  health check.
- `redis`: a pinned Redis version, private network only, persistent only when
  the chosen Kafil cache contract requires it.
- `caddy`: HTTPS termination and reverse proxy with persistent certificate
  state.

Do not publish PostgreSQL, Redis, or port `3000` to the public interface. Put
them on a private Compose network. Configure container restart policies, log
rotation, health checks, and `init: true`. Run the application as a non-root
user. Add `no-new-privileges` and a read-only filesystem only after runtime
writable paths have been identified and mounted explicitly.

## 5. Repository Artifacts to Implement

Create and review these files in the repository:

```text
Dockerfile
.dockerignore
compose.production.yml
deploy/Caddyfile
deploy/env/app.env.example
deploy/env/infrastructure.env.example
scripts/deployVps.sh
scripts/verifyVpsDeployment.sh
.github/workflows/deploy-demo.yml
docs/runbooks/vps-operations.md
docs/runbooks/backup-restore.md
```

Rules for the artifacts:

- The real environment files remain only on the VPS. Commit examples containing
  placeholders, never usable secrets.
- `.dockerignore` must exclude `.git`, `.env*` except explicit examples,
  `node_modules`, build output, test output, local certificates, local storage,
  backups, and editor files.
- Pin the build and runtime base image to `oven/bun:1.3.14`; do not use
  `oven/bun:latest`.
- Use a multi-stage Dockerfile. Install with `bun install --frozen-lockfile`,
  build from the workspace root, and copy only the runtime-required workspace,
  build output, migrations, public assets, and dependencies into the final
  stage.
- Start with the proven `next start` workspace layout. Treat Next.js standalone
  output as a later image-size optimization unless container tests prove that
  it includes all Kafil workspace imports and required runtime files.
- The image must contain the migration files and whatever executable migration
  path the `migrate` service needs. Prefer a small application-owned production
  migration entrypoint over shipping an unnecessary development tool, but do
  not change the migration mechanism without tests.
- The application storage directory must be an explicit bind mount or volume,
  with `KAFIL_STORAGE_PATH` pointing to it.
- Add OCI labels containing source repository, revision, and creation time.
- Add a Docker health check. Use readiness when available, not only process
  liveness.

## 6. VPS Bootstrap

Perform bootstrap interactively and record every result in the operations
runbook.

1. Inspect the operating system, architecture, CPU, RAM, disk, existing
   services, listening ports, firewall, DNS, and Docker installation.
2. Before changing SSH or firewall configuration, confirm a second working SSH
   session and the provider's recovery-console access.
3. Create a non-root deployment account with only the permissions required to
   manage this Compose project. Do not allow password SSH login.
4. Install Docker Engine, Buildx, and the Compose plugin from Docker's official
   repository for the detected distribution. Do not use the convenience script
   for a production server.
5. Configure automatic operating-system security updates and a reboot policy.
6. Configure the firewall to permit the confirmed SSH port plus TCP `80` and
   `443`. Account for Docker's documented interaction with UFW/firewalld; do
   not assume a published Docker port is filtered by UFW.
7. Create owned deployment directories, for example:

   ```text
   /opt/kafil/compose
   /opt/kafil/env
   /opt/kafil/releases
   /srv/kafil/storage-demo
   /srv/kafil/storage-production
   /var/backups/kafil
   ```

8. Bootstrap `/opt/kafil/releases` with the first reviewed deployment bundle:
   `compose.production.yml`, `deploy/Caddyfile`, and the deployment/verification
   scripts. Later releases upload these same versioned artifacts from GitHub.
   The application source is not needed on the VPS.
9. Store runtime and infrastructure environment files under `/opt/kafil/env`
   with access restricted to the deployment account and root.
10. If GHCR is private, authenticate the VPS using a dedicated least-privilege
    credential with `read:packages`. Do not reuse a personal all-repository
    token. Prefer a public image only if making the image public is acceptable.
11. Point the demo DNS record to the VPS and verify propagation before starting
    Caddy. Caddy should acquire and renew the HTTPS certificate automatically.

Never expose the Docker socket over TCP. Never add the web application itself
to the host network.

## 7. Environment Separation

Keep infrastructure variables separate from Kafil runtime variables.

The application environment must include reviewed production values for:

- `DATABASE_URL`
- `FRONTEND_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `NAJM_ENCRYPTION_KEY`
- `KAFIL_STORAGE_PATH`
- `LOG_FORMAT=json`
- `LOG_LEVEL`
- `NEXT_PUBLIC_FORM_FILL_ENABLED=false`
- the selected non-console email provider and sender settings
- Redis/cache settings after verifying the installed Najm package contract
- trusted proxy, secure-cookie, and rate-limit settings after verifying their
  actual code/package names

Use separate strong database and Redis credentials. Generate secrets with a
cryptographically secure tool on an administrator-controlled machine. Do not
print them into terminal transcripts or model responses.

`NEXT_PUBLIC_*` values are build-time public values. The workflow must explicitly
build demo images with form fill disabled. Server-only secrets are runtime
values and must not be required to build the image. If the current Next.js
build initializes configuration that requires secrets, refactor that boundary
or use non-secret build placeholders through a BuildKit secret; never supply
real production secrets as Docker build arguments.

## 8. GitHub Actions Pipeline

Create a GitHub environment named `demo-vps`. Restrict it to the chosen branch.
The workflow should use concurrency so only one deployment can modify the VPS
at a time.

Required jobs:

1. **Verify**
   - Check out the exact commit.
   - Install Bun `1.3.14`.
   - Run `bun install --frozen-lockfile`.
   - Run `bun run lint`.
   - Run `bun run typecheck`.
   - Run `bun run test`.
   - Run `bun run build` with reviewed non-production build values.
   - Do not deploy if any command fails.
2. **Build and publish**
   - Authenticate to GHCR with the workflow `GITHUB_TOKEN`.
   - Give the job only `contents: read` and `packages: write` permissions.
   - Build after verification succeeds.
   - Push an immutable tag such as `sha-<full-commit-sha>`.
   - An optional moving `demo` tag may exist for humans, but deployment must
     use the immutable SHA tag.
   - Add build provenance/attestation when compatible with repository
     visibility and settings.
3. **Deploy**
   - Use the protected `demo-vps` environment.
   - Install an SSH private key from an environment secret.
   - Verify the server against a pre-recorded `known_hosts` entry. Do not trust
     a host key collected for the first time inside the deployment job.
   - Upload a small release bundle containing only the versioned Compose file,
     Caddyfile, deployment scripts, and release metadata into
     `/opt/kafil/releases/<full-commit-sha>`. Do not upload source, example env
     files, or secrets.
   - Validate the uploaded file checksums and Compose configuration before
     making the release current.
   - Send the immutable image tag/revision to the VPS deployment script.
     Application secrets remain on the VPS.
   - Do not use shell interpolation of untrusted branch, PR, or commit-message
     content.
   - Record the successful Git SHA and image digest.

Explicitly declare minimal workflow permissions and pin every third-party
GitHub Action to a reviewed full commit SHA.

## 9. Atomic Deployment Procedure

The VPS deployment script must use strict shell behavior and a host lock so two
deployments cannot overlap. Given a validated immutable image tag, it must:

1. Validate the image tag format and required files.
2. Validate the versioned Compose and Caddy configuration before switching
   from the current release directory.
3. Record the currently running image digest and release bundle as rollback
   candidates.
4. Pull the new `app` image without stopping the current application.
5. Run the one-shot `migrate` service against the configured database.
6. If migration fails, stop immediately and leave the existing application
   running.
7. Switch the current release pointer, safely reload Caddy only if its
   configuration changed, and replace only the application service. Do not run
   `docker compose down`.
8. Poll readiness over the private network and then through the public HTTPS
   hostname with a bounded timeout.
9. Verify at minimum:
   - `/` returns `200`.
   - `/dashboard` returns the expected role-aware response or redirect.
   - `/api/system/health` returns `200`.
   - the new readiness endpoint confirms PostgreSQL and required dependencies.
   - `/api/mcp/tools` exposes the expected authenticated/authorized behavior.
10. If runtime readiness fails, restore the previous release bundle and
    application image, then report the failed revision. Do not claim database
    rollback: forward migrations must remain compatible with the previous
    application version.
11. Write a deployment record containing UTC time, Git SHA, image digest,
    migration list, health result, and rollback image.

Use expand/contract migrations so both the old and new application can operate
during a rollback window. Destructive schema cleanup must be a later release
after old code is no longer a rollback candidate.

A single Compose application instance may have a brief restart. Do not claim
zero downtime. Blue/green application containers and proxy switching can be a
later measured requirement.

## 10. Initial Production-Like Demo Setup

Run this only after Docker, HTTPS, migrations, backups, logging, readiness, and
the deployment pipeline pass.

1. Confirm the database is the intended new demo database and contains no
   valuable data.
2. Apply migrations.
3. Manually run `bun run seed -- setup --yes` inside a one-shot application
   container to create the Kafil auth roles, permissions, and demo admin. This
   command is destructive and is allowed here only after step 1.
4. Manually run the demo command inside a one-shot application container:

   ```bash
   bun run seed -- demo --families=<count> --sponsors=<count> --operators=<count> --contributions=<count>
   ```

   Resolve and validate the desired counts with the user first.
5. Run `seed -- verify` and the role-specific browser smoke tests.
6. Mark the UI and hostname clearly as demo and prohibit real financial or
   sensitive personal information.
7. Capture a database and storage backup, restore it into an isolated target,
   and record evidence.

After this initialization, ordinary GitHub deployments perform migrations and
application replacement only. They never reset or reseed the database.

## 11. Backups and Recovery

Before accepting demo users:

- Schedule authenticated PostgreSQL backups to `/var/backups/kafil`.
- Encrypt and copy backups to an off-VPS location.
- Back up the persistent Kafil storage path consistently with database state.
- Define retention and alert on failed or missing backups.
- Perform a restore into an isolated database and storage location.
- Verify reconciliation, authentication invalidation, and application health
  after restore.
- Document recovery for database loss, Redis loss, storage loss, a failed
  migration, an unhealthy release, and an expired TLS certificate.

A backup is not proven until a restore rehearsal passes.

## 12. Transition from Demo to Real Production

This is a separate, manually approved maintenance operation. Do not delete the
demo database or storage first. Make the transition recoverable:

1. Freeze deployments and enable maintenance mode.
2. Record the deployed Git SHA and migration state.
3. Back up the demo database, persistent storage, Compose configuration, and
   environment metadata. Do not include secrets in the written record.
4. Create a **new empty production database** with new credentials. Point the
   production runtime environment at it. Keep the demo database temporarily for
   rollback/reference.
5. Create a **new empty production storage location**. Do not reuse the demo
   upload directory.
6. Rotate JWT secrets, the Najm encryption key, admin credentials, email/API
   credentials, Redis credentials or namespace, and deployment credentials as
   appropriate. Demo sessions must not survive.
7. Apply all migrations to the empty production database.
8. Seed only essential roles, permissions, and the real bootstrap admin. Do not
   create demo families, sponsors, operators, contributions, orders, or images.
9. Configure the real email transport and verify sender-domain DNS.
10. Point the real hostname at the tested stack, allow Caddy to obtain HTTPS,
    and verify secure cookies and proxy headers.
11. Run seed verification, reconciliation, authorization/privacy tests, browser
    role tests, readiness, and public smoke tests.
12. Reopen access only after the Phase 7 release checklist is closed.
13. Retain the demo backup/database for the agreed retention period, then ask
    for explicit approval before deleting it.

Do not delete the seed package from source. Demo fixtures remain useful for
development and isolated test environments; production safety comes from
separate data targets and guarded operational commands.

## 13. Public-Launch Blockers

The Docker demo may be production-like, but it must not be described as the
real production release until the active Phase 7 plan closes at least these
operations gates:

- database readiness
- production Redis/cache integration
- sensitive-command rate limits
- secure cookies and trusted proxy handling
- security headers and Content Security Policy
- structured privacy-safe logs and request IDs
- monitoring and alerts
- PostgreSQL and storage backup/restore rehearsal
- staging smoke, rollback rehearsal, privacy review, and reconciliation

Report every item as `[x]`, `[ ]`, or `[~]`; never silently convert an open gate
into an assumption.

## 14. Verification Evidence

Before handing the deployment back, provide exact outputs or concise result
tables for:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
docker build --check .
docker compose -f compose.production.yml config --quiet
```

Also record:

- Docker and Compose versions
- image tag and digest
- container users and exposed host ports
- migration result from an empty database
- migration result from a previous-release database when one exists
- HTTPS certificate and redirect result
- readiness and public smoke results
- database/storage backup and isolated restore result
- failed-deployment rollback rehearsal
- demo seed verification and role-specific browser results

Do not run a destructive full reset against an existing database merely to
produce evidence.

## 15. Required Handoff Format

The coding model must finish with:

1. A list of repository files added or changed.
2. A list of VPS files/services changed.
3. A redacted environment-variable checklist.
4. The deployed Git SHA and image digest.
5. A verification table with exact command outcomes.
6. A release checklist using `[x]`, `[~]`, and `[ ]`.
7. The rollback command/procedure and last known-good image.
8. Remaining blockers for real production.

If DNS, repository access, VPS authority, secrets, email credentials, or backup
storage is unavailable, stop at the corresponding gate and report the precise
missing input. Do not bypass the gate with insecure defaults.

## 16. Primary References

- Docker Engine installation:
  <https://docs.docker.com/engine/install/ubuntu/>
- Docker Compose plugin:
  <https://docs.docker.com/compose/install/linux/>
- GitHub container publishing:
  <https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images>
- GitHub Container Registry authentication:
  <https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry>
- GitHub deployment environments:
  <https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments>
- GitHub Actions security:
  <https://docs.github.com/en/actions/reference/security/secure-use>
- Next.js self-hosting:
  <https://nextjs.org/docs/app/guides/self-hosting>
- Bun Docker guide: <https://bun.sh/docs/guides/ecosystem/docker>
