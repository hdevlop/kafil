# Hero artwork — `public/hero/`

Locale-aware carousel sources for the public landing page. Served as
`/hero/...` content assets (not branding assets).

## Files

| File | Dimensions | Format | Embedded language | Locale owner | SHA-256 (12) |
|------|------------|--------|-------------------|--------------|--------------|
| `hero-family_en.png` | 1448 × 1086 | PNG | English | en slide 1 (legacy base, provenance on hold) | `a603ea0d76ae` |
| `hero-family_en-02.png` | 1448 × 1086 | PNG | English | en slide 2 (synthetic English headline + grocery goods) | `1481c1e78e05` |
| `hero-family_fr.png` | 1448 × 1086 | PNG | French | fr slide 1 (legacy base, provenance on hold) | `c7cdfac1fd87` |
| `hero-family_fr-02.png` | 1448 × 1086 | PNG | French | fr slide 2 (synthetic French headline + grocery goods) | `31ffcf2c9215` |
| `hero-family_ar.png` | 1448 × 1086 | PNG | Arabic | ar slide 1 (legacy base, provenance on hold) | `3afdb5e4e7cd` |
| `hero-family_ar-02.png` | 1448 × 1086 | PNG | Arabic | ar slide 2 (synthetic Arabic headline + grocery goods) | `efef29bc9470` |
| `hero-family_es.png` | 1448 × 1086 | PNG | Spanish | es slide 1 (synthetic Spanish headline + checklist) | `f0cf77a5dea3` |
| `hero-family_es-02.png` | 1448 × 1086 | PNG | Spanish | es slide 2 (synthetic Spanish headline + grocery goods) | `5c70deb3f135` |
| `hero-family-neutral.webp` | 1448 × 1086 | WebP q80 | none | language-neutral failure fallback for all locales | `878419185b25` |

All slides share the 4:3 ratio. Every slide-2 file is a separate synthetic
composition — never a crop of its locale's slide 1 — so rotation shows
genuinely distinct artwork (headline + goods panel versus the slide-1
composition). Every file is byte-distinct from all others (see hashes above;
the source test rejects duplicates). Each synthetic file embeds only its own
locale's language plus the shared "Kafil" proper noun, so rotation never shows
another locale's language. The neutral fallback is intentionally text-free so
it can never display a foreign language.

## Generation

Run `bun apps/web/scripts/generate-landing-hero-slides.mjs` to reproduce the
synthetic files. The script overwrites only these five files and never touches
the legacy bases:

- `hero-family_en-02.png`, `hero-family_fr-02.png`,
  `hero-family_ar-02.png`: synthetic locale-pure SVG compositions rendered
  with `sharp(Buffer.from(svg)).png()` — a locale headline plus a
  goods-focused panel (single good, oil, and an approved-purchases bar). The
  goods composition matches the slide-2 accessibility description
  ("closer view ... goods").
- `hero-family_es.png`, `hero-family_es-02.png`: synthetic
  Spanish-embedded-text SVG composites rendered with
  `sharp(Buffer.from(svg)).png()`. Slide 1 carries the family-support
  checklist; slide 2 carries grocery goods. No other language appears in
  either file.
- `hero-family-neutral.webp`: synthetic solid-color image generated with
  `sharp({ create: { width: 1448, height: 1086 } }).webp({ quality: 80 })`.

## Provenance

Two provenance classes exist in this directory; do not conflate them.

- **Project-owned synthetics** (`hero-family_{en,fr,ar}-02.png`,
  `hero-family_es.png`, `hero-family_es-02.png`,
  `hero-family-neutral.webp`): created by the Kafil repository script above
  from inline SVG/solid-color sources. No third-party source, no depicted
  person, no license encumbrance. Cleared as placeholder carousel artwork.
- **Legacy bases on hold** (`hero-family_{en,fr,ar}.png`): origin and license
  unrecorded. Do not treat them as evidence of consent or ownership; confirm
  provenance (or replace them with licensed/consented assets) before any use
  beyond this placeholder carousel. Final acceptance stays blocked on these
  three files until that hold is cleared.

## People and consent

The legacy base slides appear to depict family/grocery scenes. Whether the
people are fictional, licensed, or consented is unrecorded. Do not describe
any depicted person as a Kafil beneficiary. Synthetic placeholders depict no
person.

## Accessibility

Essential meaning always exists as real localized HTML outside the image.
Each manifest slide carries a localized concise description key
(`ui.landing.hero.slide{N}Alt`); the neutral fallback is decorative-safe and
described by the active slide's key, never by baked-in slogans.
