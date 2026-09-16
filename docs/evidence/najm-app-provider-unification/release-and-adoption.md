# Najm application provider unification - release and adoption

Date: 2026-09-17

## Package publication

Najm source commit `9a8424b6f4022bfa51a98c481cb2cf2178be36f7` was clean before the final
tarballs were packed. The exact tarballs were then published and independently
read back from the public npm registry.

| Package | Registry version | Packed SHA-256 | Registry shasum |
| --- | --- | --- | --- |
| `najm-cli` | `2.1.0` | `b58a468a5ca6fd9e6497d6db5dfdea1d09185542675fb3bcbe9e45cfd6b25190` | `a7677f993469304c37573cbb831e29dc0f28d592` |
| `najm-kit` | `2.15.0` | `f0f0499ed64c75d7ea060c1a1f2087334036f31d90cc6b63b335a1f26927b715` | `6feab44515d9d75b8440f9d1d1f6f0a2dab1bac4` |
| `najm-next` | `0.6.0` | `da9d159d1c95dea67be5148f83aae893a0ff5fe6ebc1a65eb10e5faf603a6282` | `55bb0147c9790ef6ebe05f48a9712382f3f3626c` |

The official `--verify-published` flow resolved an integrity hash, shasum, and
registry tarball URL for every exact version. Registry-only generated Next 16
production fixtures passed for minimal, Leaflet, and Google profiles.

## Consumer adoption

Kafil pins `najm-kit@2.15.0` and `najm-next@0.6.0`, mounts the direct
`NajmAppProvider`, and removes the obsolete Kit/Next patches. Its intentional
wrapper remains only for Kafil's Leaflet labels and no-geocoder policy.

School pins the same versions, replaces its explicit Auth/Query/UI/Branding/
Location stack with the direct provider, and removes its obsolete Next patch.
The remaining wrappers retain School's Google adapter and keyboard extension.
Its Query retry/cache policy, institution currency, preference normalization,
and form-development behavior remain explicit application policy.

## Non-browser verification

Kafil passed:

- `bun run lint`
- `bun run typecheck`
- `bun run test` (`448` web, `413` server, and `90` seed tests passed; database
  integration tests retained their normal opt-in skips)
- `bun run build`
- `bun run db:generate` (no schema changes)

School passed:

- `bun run lint` (no errors; three existing `<img>` optimization warnings)
- `bun run test:dashboard` (`77` tests)
- `bun run test:server` (`1166` tests)
- `bun run test:seed` (`9` tests)
- `bun run build:all`
- `bun run i18n:check` (no missing keys)
- `bun run db:generate` (no schema changes)

No Playwright, browser, or visual acceptance was run, as explicitly requested.
Deployment was not requested and remains separate.

## Git publication

The implementation/adoption revisions published to their tracked branches are:

- Najm `master`: `9a8424b6f4022bfa51a98c481cb2cf2178be36f7`
- School `feat/trusted-proxy-rate-limit-hardening`:
  `299b44c199f026245b012fba03259c2b551b0e1d`
- Kafil `main`: `70e24946fb818a8bbf4fb08f71460ee7bb5b7467`
