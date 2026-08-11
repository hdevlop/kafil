# Kafil Najm Theme 0.2 adoption evidence

Recorded: 2026-08-11

## Published package provenance

| Package | Version | Registry and candidate SHA-256 | Packing commit |
| --- | --- | --- | --- |
| `najm-kit` | `2.11.0` | `c13b02fdf014c8c1c52db8c1d7b32d385ed64d36a47f414c0b170e626cfb618d` | `f7c9d0b4f61a2a3a3446538d401a0ecdded00618` |
| `najm-theme` | `0.2.0` | `9289f09359c297fbad460be9f2391fbdc2ed70bc5c4316285b09d33bd8a5013e` | `d5deb0ccfabf998abfa84c83fdafd8f1bb3c034c` |

The registry tarballs were downloaded after publication and matched the exact
candidate SHA-256 values. Kafil uses registry versions; no local `file:` pin is
committed.

## Automated evidence before publication

The candidate installation passed lint, typecheck, web/server/seed unit suites,
the production build, and `db:generate` with no schema change. These commands
were not rerun after registry pinning at the user's explicit request. A frozen
install completed with no changes, and the registry packages are byte-identical
to the tested candidates.

## Browser evidence

The production run completed three anonymous checks and skipped two
authenticated checks because the available database had no usable admin
identity. The recorded screenshots are:

- `kafil-auth-desktop.png`
- `kafil-auth-mobile.png`
- `kafil-auth-rtl.png`
- `kafil-auth-asset-404-fallback.png`

Confirmed: factory auth logo/hero delivery, WebP MIME, immutable caching,
desktop, 390 px mobile, Arabic RTL, and no surviving broken image after the
controlled failure.

Manual acceptance remains open for expanded/collapsed sidebar marks, Theme
Settings upload/save/reload/reset, and the Kafil `NCredentialsCard` handover
including Arabic paint order, copy success/failure, Copy-to-Done keyboard order,
and dialog focus restoration.
