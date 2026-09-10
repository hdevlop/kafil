# Family examples — `public/landing/`

Fictional illustrative artwork for the landing family-example grid. Served
as `/landing/...` content assets (not branding assets, not managed images).

## Active files

Eight synthetic illustrations, each 1448 × 1086 PNG (4:3):

`family-example-01-v2.png` … `family-example-08-v2.png`

- Source: generated with OpenAI Imagegen on 2026-09-08, using the user-supplied
  landing-page image as a visual style and composition reference only.
- Prompt direction: warm painterly editorial portraits of distinct fictional
  Moroccan family groups in home or courtyard settings; natural light, muted
  teal/ochre/rose clothing, welcoming expressions, and card-safe composition.
- Exclusions: no real or identifiable people, text, UI, badges, logos,
  trademarks, mascots, products, money, donation transactions, or watermarks.
- People: every depicted person is fictional. Cards are explicitly labelled
  as illustrative examples; no image depicts, names, or implies a registered
  Kafil family or beneficiary.
- Embedded language: none (text-free).
- Locale ownership: shared by all locales; surrounding names, cities, and
  need amounts are real localized HTML, not baked into the image.

Short SHA-256 fingerprints, in file order:

`4d7c53b28e86`, `44ea9066ba7b`, `1ec2e8523cc6`, `59d9b8b2543d`,
`48b922c271c2`, `332987b975c9`, `bf39f4a3f327`, `d71a3fb93c9f`.

## Accessibility

Each card image carries concise localized alt text for its active locale
(`ui.landing.families.card{N}Alt`). The visible "Illustrative example"
disclosure plus neutral Example badge (never Verified wording) is rendered
as real HTML alongside every card.

## Landing explanatory-section assets

Generated with OpenAI ImageGen on 2026-09-10 from the user-provided landing
section reference as a visual style, palette, and composition reference only.
They are Kafil content assets, not branding assets or managed family uploads.

| File | Dimensions | Purpose | Accessibility |
|------|------------|---------|---------------|
| `dignity-family-v1.webp` | 1448 x 1086 | Fictional Moroccan mother and two children with practical groceries for the dignity section | Meaningful; use a concise localized alt description |
| `order-school-bag-v1.webp` | 512 x 512 | School-bag thumbnail in the illustrative order | Decorative beside the visible product name; use `alt=""` |
| `order-notebooks-v1.webp` | 512 x 512 | Notebook thumbnail in the illustrative order | Decorative beside the visible product name; use `alt=""` |
| `order-stationery-v1.webp` | 512 x 512 | Stationery thumbnail in the illustrative order | Decorative beside the visible product name; use `alt=""` |

- Family prompt direction: warm painterly editorial illustration of a
  dignified fictional Moroccan family with rice, cooking oil, plain jars and
  an unbranded shopping bag; subtle arch, zellige, plants, cream/sand setting,
  restrained teal accents, no distress imagery.
- Product prompt direction: isolated premium editorial product cutouts with
  consistent soft daylight, restrained teal/coral/amber/navy palette, genuine
  transparent backgrounds, and no brands, text, UI, people, or watermarks.
- Embedded language: none. All headings, labels, prices, statuses, buttons,
  and receipt content must remain localized HTML.
- Optimization: WebP quality 88; the family image preserves its generated 4:3
  dimensions and the product cutouts are resized to 512 x 512 with alpha.
- Loading: all four assets are below the fold and must remain lazy/non-priority
  through `NNextImage` with explicit dimensions and responsive `sizes`.

SHA-256 fingerprints:

- `dignity-family-v1.webp`: `56da8316625d`
- `order-school-bag-v1.webp`: `2456f87a11ff`
- `order-notebooks-v1.webp`: `1dd740c89f64`
- `order-stationery-v1.webp`: `0ebc360118e3`
