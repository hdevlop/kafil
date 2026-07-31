# Kafil seed package

This package owns database setup and repeatable development fixtures. It runs
as a CLI outside the Next.js process. The browser-safe `@kafil/seed/fakers`
subpath remains the shared development form generator.

## Environment

Copy the root `.env.example` to `.env` and set:

- `DATABASE_URL`
- `KAFIL_ADMIN_EMAIL`
- `KAFIL_ADMIN_PASSWORD`

The aliases `ADMIN_EMAIL` and `ADMIN_PASSWORD` are also accepted.

## CLI

Run commands from the repository root. Open the interactive menu with:

```bash
bun run seed
```

Run a command directly with:

```bash
bun run seed -- setup
bun run seed -- demo
bun run seed -- remove
bun run seed -- full
bun run seed -- migrate
bun run seed -- admin
bun run seed -- categories
bun run seed -- verify
bun run seed -- images
```

`setup` applies migrations, clears application data and every mutable managed
storage directory, then restores the bootstrap admin, roles, and permissions.
`remove` deletes the deterministic demo graph and resets the catalog by deleting
products without retained order history plus every category left empty. It also
removes the deleted records' protected files and sweeps unreferenced UUID-managed
profile and catalog images. Products required by retained non-demo order history
remain intact. Branding remains separate because its settings and draft lifecycle
are retained across application-data resets.
`full` runs `setup` and then adds demo data. These destructive commands ask for
confirmation; use `--yes` only for intentional non-interactive execution:

```bash
bun run seed -- full --yes
```

### Bootstrap admin credentials

In an interactive terminal, `bun run seed -- admin` asks for the admin email,
a masked password, and a masked password confirmation before it starts any
database work. The email defaults to the configured environment value when one
exists; passwords are never pre-filled, displayed, or passed in command-line
arguments.

In non-interactive automation, provide the existing environment variables:

```bash
KAFIL_ADMIN_EMAIL=admin@example.com \
KAFIL_ADMIN_PASSWORD='StrongPassword1' \
bun run seed -- admin
```

The `admin` command creates or safely repairs the single bootstrap admin and
the managed roles, permissions, and role-permission assignments. It may update
that admin's email and password while preserving its user ID, and it revokes
active admin sessions when credentials change. It does not migrate, reset,
truncate, or seed application/demo data. Do not use the destructive `setup` or
`full` commands for credential changes.

Interactive values update the database for that execution only. The CLI does
not rewrite environment files. For local development, update `.env` separately
when it remains the desired secret source. On the VPS, update the protected
`/opt/kafil/env/app.env` separately before a future non-interactive admin seed;
otherwise the old environment credentials may be synchronized again. Do not
mount that protected VPS file read-write into the normal web container merely
to support this CLI.

### Catalog categories

The standalone category seed creates or repairs the packaged catalog category
names, descriptions, display order, active status, and images without clearing
other application data:

```bash
bun run seed -- categories
```

Validate the optimized package library and inventory/backfill existing managed
references with explicit dry-run, apply, and rollback modes:

```bash
bun run seed:images
bun run images:backfill
bun run images:backfill -- --apply --database-backup=/backups/kafil.sql --storage-backup=/backups/kafil-storage
bun run images:backfill -- --rollback=/storage/operations/image-backfill-....json
```

Apply mode refuses to start unless both backup paths exist. It retains original
files, updates only matching database references, writes checksummed rollback
metadata without image bytes or personal names, and keeps branding revision
increments intact.

The `demo` and `full` commands run the same category seed automatically, then
create or repair 18 matching image-backed demo products. Source images live
directly in `packages/seed/images/` using each category slug as the filename,
such as `fresh-produce.webp` and `school-supplies.webp`. The seed normalizes
them through the server-owned image processor into managed category/product
storage with stable content-versioned names.

The default demo creates 10 families, 20 sponsors, 6 operators, 4 delivery
staff, and 20 contributions. Fully funded families receive 24 repeat orders
spread across the trailing 12 months, with a realistic mix of delivered,
rejected, cancelled, approved, purchased, pending, and out-for-delivery states.
Order creation and lifecycle transitions use the normal services and ledger
commands; reruns reuse the deterministic records.

`demo` accepts configurable counts:

```bash
bun run seed -- demo --families=10 --sponsors=20 --operators=6 --deliveries=4 --contributions=20
```

Short flags `-f`, `-s`, `-o`, `-d`, and `-c` are also accepted. The compatibility
commands `bun run seed:demo`, `bun run seed:full`, `bun run seed:migrate`,
`bun run seed:admin`, `bun run seed:categories`, and `bun run seed:verify`
remain available.

`full` is the default highlighted choice in `bun run seed`. Press Enter and the
Clack interface asks for family, sponsor, operator, delivery-staff, and
contribution counts separately before the destructive confirmation. Choosing
`demo` asks the same questions without resetting existing data. Running
`bun run seed -- demo` or `bun run seed -- full` directly also asks for counts
when no count flags were provided. Press Enter on any count to accept its
displayed default.

## Seed image library

Use these source folders:

```text
packages/seed/images/
  fresh-produce.webp
  school-supplies.webp
  family-01.webp
  family-02.webp
  family-03.webp
  sponsor-f-01.webp
  sponsor-m-01.webp
  child-f-01.webp
  child-m-01.webp
```

Keep one flat folder. Family images are neutral and represent the whole
household. Use the exact `family-NN.ext` prefix with a numeric suffix of at
least two digits. Sponsor and child images are gender-matched and use the
`sponsor-g-NN.ext` or `child-g-NN.ext` prefix. The numeric suffix must be
unique within the same kind and gender pool, even when extensions differ.
Files are assigned in numeric order. When fewer images exist than accounts,
each image is used once and the remaining accounts keep an empty image so the
normal fallback avatar is shown. Records never borrow images from the opposite
gender pool. A library with only the included README is valid and leaves every
placeholder avatar in use.

Supported formats are AVIF, GIF, JPEG, PNG, and WebP, with a 5 MB maximum per
file. Nested folders and other filenames are rejected. Validate and preview the
library without changing the database:

```bash
bun run seed -- images
```

During `demo` or `full`, the seed copies these source files into Kafil's managed
storage using stable, content-versioned UUID filenames derived from the profile
and image. Replacing an image therefore produces a new URL instead of a stale
immutable browser cache entry. The protected API paths are written into the
Najm user records. Family files go to `storage/family-images`; sponsor files go
to `storage/sponsor-images`. The package image folders stay the canonical input
and are never deleted by a database reset.

## Development form data

Kafil data-entry forms use `buildFormFill` from `@kafil/seed/fakers`. In a
supported browser form, open it and press `F8` to replace its current values
with realistic fake data. Relation fields are selected from options already
loaded by that form.

Use `/operator/settings` to enable or disable the shortcut. The persisted
setting is disabled by default and applies without a Docker restart.
