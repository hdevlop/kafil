# Najm Kit Person Images Plan

Status: **PROPOSED**

Last updated: 2026-08-08

Repositories:

- Najm Kit: `C:\Users\hdevlop\Desktop\najm\packages\najm-kit`
- Kafil consumer: `C:\Users\hdevlop\Desktop\kafil`

This is a focused cross-repository migration design. Root `PLAN.md` remains
Kafil's authoritative execution roadmap and decides when this work is scheduled.

## Goal

Move reusable person-image selection out of Kafil and into a framework-neutral
`najm-kit/person-images` entry. Najm Kit must provide useful built-in images for
common people while allowing each application to add or override roles such as
`teacher`, `student`, `doctor`, or `driver` without changing Najm Kit.

After migration:

- Kafil has no `apps/web/src/lib/personImages.ts`;
- Kafil has no duplicated `apps/web/public/images/people` assets;
- Kafil uses one `getPersonImage(...)` contract for children, families,
  parents, sponsors, staff, applicants, and delivery staff;
- another application can create a typed resolver with its own roles and image
  paths;
- uploaded images still take priority over every fallback;
- `noavatar.png`, blank values, and missing values still resolve safely.

## Confirmed baseline

- Kafil currently pins and installs `najm-kit@2.8.1`.
- Najm Kit already exports `isPlaceholderAvatar` and `resolveAvatarSrc` from
  its main entry.
- Kafil's local `PERSON_IMAGE_PATHS` contains seven WebP files: female/male
  child, neutral family, female/male parent, and female/male sponsor.
- Thirty-three Kafil source files import the local helper.
- The current local helper combines reusable source validation with
  Kafil-specific role names and application-root `/images/people/*` paths.
- Najm Kit currently publishes only `dist`, so moving TypeScript alone would
  not make Kafil's public paths available to other applications.

## API decision

Use a dedicated subpath rather than the main package barrel:

```ts
import {
  createPersonImageResolver,
  getPersonImage,
} from "najm-kit/person-images";
```

The subpath keeps the image payload out of applications that do not use person
fallbacks and remains React-, Next.js-, and DOM-independent.

### Public types

```ts
export type PersonImageGender = "F" | "M" | null;

export interface PersonImageRoleDefinition {
  default: string;
  female?: string;
  male?: string;
}

export type BuiltInPersonImageRole =
  | "child"
  | "adult"
  | "parent"
  | "family";

export interface PersonImageInput<Role extends string> {
  image?: string | null;
  role: Role;
  gender?: PersonImageGender;
  fallback?: string | null;
}

export type PersonImageRoleMap = Record<
  string,
  PersonImageRoleDefinition
>;

export type PersonImageResolver<Role extends string> = (
  input: PersonImageInput<Role>,
) => string;
```

`PersonImageRoleDefinition.default` is required. It guarantees that every
configured role resolves to a string even when gender is missing or unknown.
Female and male variants are optional refinements.

### Built-in resolver

Najm Kit exports a preconfigured resolver:

```ts
const imageSrc = getPersonImage({
  image: child.image,
  role: "child",
  gender: child.gender,
});
```

Built-in role mapping:

| Role | Default | Female | Male |
| --- | --- | --- | --- |
| `child` | male child image | female child image | male child image |
| `adult` | male adult image | female adult image | male adult image |
| `parent` | male parent image | female parent image | male parent image |
| `family` | neutral family image | neutral family image | neutral family image |

The current sponsor artwork becomes the generic built-in adult artwork.
Sponsors, staff, applicants, teachers without custom assets, and delivery staff
may therefore share the `adult` role.

### Extensible resolver factory

`createPersonImageResolver()` merges custom definitions over the built-in map,
infers custom role names in TypeScript, and returns a function with the same
input contract.

An SMS application can add teacher and student roles:

```ts
const getSmsPersonImage = createPersonImageResolver({
  teacher: {
    default: "/images/teachers/default.webp",
    female: "/images/teachers/female.webp",
    male: "/images/teachers/male.webp",
  },
  student: {
    default: "/images/students/default.webp",
    female: "/images/students/female.webp",
    male: "/images/students/male.webp",
  },
});

const teacherImage = getSmsPersonImage({
  image: teacher.image,
  role: "teacher",
  gender: teacher.gender,
});
```

The same factory can override a built-in role for one application:

```ts
const getSchoolPersonImage = createPersonImageResolver({
  child: {
    default: "/images/pupils/default.webp",
    female: "/images/pupils/female.webp",
    male: "/images/pupils/male.webp",
  },
});
```

Custom paths may be application-relative URLs, managed API URLs, CDN URLs, or
data URLs. Najm Kit does not fetch, upload, authorize, or persist them.

## Resolution behavior

For every resolver call, use this exact precedence:

1. Return `image` when `resolveAvatarSrc` considers it a real source.
2. Otherwise return the per-call `fallback` when it is non-empty and is not a
   `noavatar.png` sentinel.
3. Otherwise select the configured role's gender variant: `female` for `F`,
   `male` for `M`, and `default` for null or omitted gender.
4. If the requested gender variant is absent, return the role's required
   `default`.

Additional rules:

- Trim string inputs before evaluating them.
- Preserve absolute URLs, relative URLs, managed API routes, data URLs, query
  strings, and fragments unchanged.
- Treat blank strings and any path whose final segment is `noavatar.png` as
  missing, preserving Najm Kit's existing sentinel behavior.
- Do not guess a gender from names.
- Do not put relationship-language parsing in the generic resolver. Kafil's
  single parent presentation maps its relationship value to `F`, `M`, or null
  at the feature boundary before calling `getPersonImage`.
- Do not add mutable global configuration or a provider. Resolver factories are
  explicit, deterministic, independently testable, and safe for concurrent
  server rendering.

## Phase 1 - Add the Najm Kit package surface

- Add the seven source WebP illustrations under Najm Kit-owned assets, renaming
  sponsor artwork to generic adult artwork in the public contract.
- Add a pure `person-images` module containing built-in definitions,
  `getPersonImage`, `createPersonImageResolver`, and the public types above.
- Reuse `resolveAvatarSrc`/`isPlaceholderAvatar`; do not duplicate the sentinel
  regular expression.
- Add `person-images` as its own `tsup` entry and
  `package.json` export with matching `.mjs` and `.d.ts` paths.
- Configure esbuild's `.webp` `dataurl` loader for this entry. The published
  resolver returns browser-usable embedded WebP data URLs, so consumers do not
  need to copy package files into `public` or configure an asset server.
- Keep the package's load-bearing `splitting: true` behavior unchanged.
- Do not re-export this surface from the root `najm-kit` barrel, because doing
  so would make the image payload reachable from every root import.
- Add README and changelog examples for built-in roles, custom roles, built-in
  overrides, and per-call fallback overrides.

Phase 1 gate:

- `najm-kit/person-images` imports without React, Next.js, or browser globals.
- Built-in roles always return a valid string.
- Custom roles are inferred by TypeScript and unknown roles fail type checking.
- The normal `najm-kit` root entry does not import or reference person assets.

## Phase 2 - Verify and release Najm Kit

- Add pure unit tests covering uploaded sources, blanks, all sentinel forms,
  built-in roles, genders, null gender, missing variants, per-call overrides,
  custom roles, and overriding built-in roles.
- Add declaration tests for inferred `teacher`/`student` role names and rejected
  unknown roles.
- Add distribution-shape tests proving `dist/person-images.mjs` and
  `dist/person-images.d.ts` exist, contain the expected API, and embed all seven
  images as WebP data URLs.
- Add a packed-package consumer smoke test that imports
  `najm-kit/person-images` through the published exports map.
- Verify the root entry and its reachable chunks do not contain the embedded
  person assets.
- Confirm the illustrations may be redistributed under Najm Kit's MIT package
  before publication.
- Prepare `najm-kit@2.8.2`, including the corresponding workspace lockfile
  version. Preserve or explicitly resolve unrelated worktree changes before
  invoking the clean-worktree publication script.
- Build, pack, hash, dry-run, publish, and registry-verify the exact same
  tarball using Najm's single-package publication workflow.

Required Najm Kit evidence:

```bash
bun run --cwd packages/najm-kit lint
bun run test:ui
bun run build:ui
bun run --cwd packages/najm-kit build:preview
bun scripts/publish-package.ts najm-kit --pack-only
bun scripts/publish-package.ts najm-kit --publish-tarball <tarball> --dry-run
bun scripts/publish-package.ts najm-kit --publish-tarball <tarball>
bun scripts/publish-package.ts najm-kit --verify-published 2.8.2
```

Phase 2 gate:

- The exact tested tarball is published as `najm-kit@2.8.2`.
- Registry metadata and downloaded tarball integrity match local evidence.
- The tarball contains no Kafil code, secrets, or unrelated files.

## Phase 3 - Migrate Kafil

- Update Kafil's root and web manifests plus `bun.lock` to the verified
  `najm-kit@2.8.2` release.
- Replace every `@/lib/personImages` import with
  `najm-kit/person-images` and use `getPersonImage` directly:
  - children use `role: "child"`;
  - families use `role: "family"`;
  - sponsors, staff, applicants, and delivery staff use `role: "adult"`;
  - household parents use `role: "parent"` after the Family Dashboard maps
    its relationship value to a gender hint.
- Keep uploaded managed-image URLs as the `image` argument so storage,
  authorization, and protected delivery behavior remain unchanged.
- Delete `apps/web/src/lib/personImages.ts` only after all imports migrate.
- Delete the seven files under `apps/web/public/images/people` only after the
  production build proves the package-owned data URLs render correctly.
- Move reusable resolver assertions into Najm Kit. Keep a small Kafil
  integration test proving role mapping and real managed-image precedence.
- Do not change backend DTOs, storage routes, privacy projections, database
  schemas, or migrations.

Phase 3 gate:

- `rg` finds no `@/lib/personImages`, `PERSON_IMAGE_PATHS`, or
  `/images/people/` reference in Kafil source or tests.
- No Kafil-local copy of the person illustrations remains.
- Real uploaded images and every built-in fallback render as before.
- Transparent loaded avatars still hide initials through the existing shared
  avatar behavior.

## Verification and acceptance

Run focused Kafil tests first, followed by the required frontend and root gates:

```bash
bun run --cwd apps/web test test/person-images.test.ts
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run build
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

`db:generate` must produce no migration. If it does, stop and investigate
unrelated schema drift rather than accepting it as part of this frontend-only
slice.

Browser acceptance must cover:

- child female and male fallbacks;
- family neutral fallback;
- parent female and male fallbacks;
- sponsor, staff, applicant, and delivery adult fallbacks;
- a real protected managed image taking precedence over the fallback;
- a `noavatar.png` source using the fallback;
- transparent loaded images not showing initials underneath;
- one production build/runtime check proving package-owned data URLs work
  without Kafil's public asset directory.

## Completion criteria

- Najm Kit owns the reusable resolver, built-in defaults, package assets,
  documentation, tests, and published subpath.
- Applications can add arbitrary typed roles without editing or republishing
  Najm Kit.
- Kafil consumes only the published API and contains no local resolver or
  duplicated fallback assets.
- Package, Kafil source, production build, and browser evidence all pass at
  recorded commits.
- Najm Kit publication and Kafil adoption remain separate commits and separate
  pass/fail gates.

