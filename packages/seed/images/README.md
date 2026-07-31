# Seed profile images

This directory holds the optimized demo seed image library. The seed CLI runs
these files through the shared managed-image processor at runtime.

## Filename contract

A family image represents the entire household. It is not classified by
gender. Sponsor and child images are gender-matched.

```text
family-01.webp
family-02.webp
sponsor-f-01.webp
sponsor-m-01.webp
child-f-01.webp
child-m-01.webp
```

Rules:

- The numeric suffix contains at least two digits.
- The numeric suffix must be unique within the same kind and gender pool. For
  example, duplicate `child-f-01` variants conflict, while `child-m-01.webp`
  does not.
- Records never borrow from the opposite gender pool. Family images are
  neutral and are not split by gender at all.
- When there are fewer images than demo records, the remaining records keep
  an empty image and use the gender-appropriate fallback (or the neutral
  family fallback for families).

## Shipped assets

This package ships with neutral family illustrations and curated gender-matched
sponsor and child fallbacks. The family files were restored from the legacy
unlabelled set. The sponsor and child files mirror the gender-appropriate
fallbacks the app already uses in the UI. Replace or extend any of them with
real licensed assets when you have them.

## Other rules

- Shipped files are static WebP images: person assets are at most 640 x 640 and
  150 KB; catalog assets are at most 1280 x 1280 and 200 KB.
- Individual demo product assets use the `product-<descriptive-name>.webp`
  convention and are referenced explicitly from `demo-product-fixtures.ts`.
- New uploads may start as AVIF, JPEG, PNG, or WebP. GIF is rejected.
- Nested folders are rejected, except the `_unclassified/` folder which holds
  legacy assets awaiting manual classification.
