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
bun run seed -- full
bun run seed -- migrate
bun run seed -- admin
bun run seed -- verify
bun run seed -- images
```

`setup` applies migrations, clears application data and managed profile image
storage, then restores the bootstrap admin, roles, and permissions. `full` runs
`setup` and then adds demo data. Both destructive commands ask for confirmation;
use `--yes` only for intentional non-interactive execution:

```bash
bun run seed -- full --yes
```

`demo` accepts configurable counts:

```bash
bun run seed -- demo --families=10 --sponsors=25 --operators=3 --contributions=40
```

Short flags `-f`, `-s`, `-o`, and `-c` are also accepted. The compatibility
commands `bun run seed:demo`, `bun run seed:full`, `bun run seed:migrate`,
`bun run seed:admin`, and `bun run seed:verify` remain available.

`full` is the default highlighted choice in `bun run seed`. Press Enter and the
Clack interface asks for family, sponsor, operator, and contribution counts
separately before the destructive confirmation. Choosing `demo` asks the same
questions without resetting existing data. Running `bun run seed -- demo` or
`bun run seed -- full` directly also asks for counts when no count flags were
provided. Press Enter on any count to accept its displayed default.

## Demo image library

Use these source folders:

```text
packages/seed/images/
  family-01.jpg
  family-02.png
  sponsor-01.webp
  sponsor-02.jpg
```

Keep one flat folder and use the exact `family-NN` or `sponsor-NN` prefix with a
numeric suffix of at least two digits. Numbers must be unique within each kind,
even when extensions differ. Files are assigned in numeric order. When fewer
images exist than accounts, each image is used once and the remaining accounts
keep an empty image so the normal fallback avatar is shown. A library with only
the included README is valid and leaves every placeholder avatar in use.

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
development build, open a form and press `F8` to replace its current values
with realistic fake data. Relation fields are selected from options already
loaded by that form.

Set `NEXT_PUBLIC_FORM_FILL_ENABLED=false` before starting Next.js to disable
the shortcut. It is disabled automatically in production builds.
