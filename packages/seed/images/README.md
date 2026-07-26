# Seed profile images

This directory holds the demo seed image library. The seed CLI copies these
files into managed Kafil storage at runtime.

## Filename contract

A family image represents the entire household. It is not classified by
gender. Sponsor and child images are gender-matched.

```text
family-01.jpg
family-02.png
sponsor-f-01.webp
sponsor-m-01.webp
child-f-01.png
child-m-01.png
```

Rules:

- The numeric suffix contains at least two digits.
- The numeric suffix must be unique within the same kind and gender pool. For
  example, `child-f-01.png` and `child-f-01.webp` conflict, while
  `child-m-01.png` does not.
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

- Supported formats: AVIF, GIF, JPEG, PNG, and WebP.
- Maximum file size: 5 MB.
- Nested folders are rejected, except the `_unclassified/` folder which holds
  legacy assets awaiting manual classification.
