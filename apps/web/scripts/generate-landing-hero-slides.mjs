// Generates the synthetic hero slides for the landing carousel.
//
// - en/fr/ar/es slide 2 and both es slides are separate synthetic SVG
//   compositions rendered with `sharp(Buffer.from(svg)).png()`: a locale-pure
//   headline plus a goods-focused panel. Slide 2 is never a crop of slide 1,
//   so rotation shows genuinely distinct artwork while staying within the
//   same locale (no foreign embedded text).
// - en/fr/ar slide 1 files are legacy base inputs (origin/license
//   unrecorded) and are never overwritten by this script. See
//   `public/hero/README.md` for the provenance hold on those three files.
//
// Run: bun apps/web/scripts/generate-landing-hero-slides.mjs
// The script overwrites only the synthetic files; base files are inputs.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const heroDir = join(here, "..", "public", "hero");

const WIDTH = 1448;
const HEIGHT = 1086;

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const FONT = "Arial, 'DejaVu Sans', sans-serif";
const GREEN = "#2f6e42";
const GOLD = "#b97f1f";
const INK = "#1c2b23";
const CARD = "#fffdf7";

function spanishSlide({
  caps = "APADRINAMIENTO RESPONSABLE",
  eyebrow,
  headlineSize = 66,
  line1,
  line2,
  right,
  footer = "Kafil · bienes reales, impacto real",
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f6f1e6"/>
  <circle cx="1210" cy="180" r="330" fill="#efe3cb"/>
  <circle cx="180" cy="950" r="240" fill="#e9efe4"/>
  <path d="M0 0 H1448 V150 H300 Q150 150 150 300 V1086 H0 Z" fill="#e9efe4" opacity="0.7"/>
  <text x="110" y="330" font-family="${FONT}" font-size="30" letter-spacing="6" fill="${GOLD}">${caps}</text>
  <text x="104" y="446" font-family="${FONT}" font-size="${headlineSize}" font-weight="bold" fill="${GREEN}">${line1}</text>
  <text x="104" y="534" font-family="${FONT}" font-size="${headlineSize}" font-weight="bold" fill="${GREEN}">${line2}</text>
  <text x="110" y="640" font-family="${FONT}" font-size="34" fill="${INK}">${eyebrow}</text>
  ${right}
  <g>
    <path d="M110 880 c-14-22-44-14-44 8 c0 20 26 32 44 46 c18-14 44-26 44-46 c0-22-30-30-44-8z" fill="${GOLD}"/>
    <text x="172" y="912" font-family="${FONT}" font-size="30" fill="${INK}">${footer}</text>
  </g>
</svg>`;
}

function checklistCard(items) {
  const rows = items
    .map(
      (label, i) => `
    <circle cx="976" cy="${380 + i * 130}" r="24" fill="${GREEN}"/>
    <path d="M965 ${380 + i * 130} l8 9 l16 -18" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="1016" y="${391 + i * 130}" font-family="${FONT}" font-size="29" fill="${INK}">${label}</text>`,
    )
    .join("");
  return `<rect x="924" y="292" width="414" height="470" rx="30" fill="${CARD}" stroke="#e3d9c2" stroke-width="2"/>${rows}`;
}

function goodsBoxes(
  labels = {
    singleInitial: "R",
    single: "Arroz",
    oil: "Aceite",
    bottomTitle: "Leche · Lentejas · Harina",
    bottomSub: "Compras aprobadas y auditables",
  },
) {
  return `
  <g>
    <rect x="890" y="330" width="200" height="250" rx="18" fill="#fffdf7" stroke="#e3d9c2" stroke-width="2"/>
    <rect x="912" y="352" width="156" height="120" rx="10" fill="#f3ead3"/>
    <text x="990" y="430" font-family="${FONT}" font-size="52" font-weight="bold" fill="${GOLD}" text-anchor="middle">${labels.singleInitial}</text>
    <text x="990" y="520" font-family="${FONT}" font-size="30" fill="${INK}" text-anchor="middle">${labels.single}</text>
    <rect x="1110" y="330" width="200" height="250" rx="18" fill="#fffdf7" stroke="#e3d9c2" stroke-width="2"/>
    <rect x="1132" y="352" width="156" height="120" rx="60" fill="#f0c75e"/>
    <text x="1210" y="520" font-family="${FONT}" font-size="30" fill="${INK}" text-anchor="middle">${labels.oil}</text>
    <rect x="890" y="600" width="420" height="150" rx="18" fill="#2f6e42"/>
    <text x="1100" y="662" font-family="${FONT}" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">${labels.bottomTitle}</text>
    <text x="1100" y="708" font-family="${FONT}" font-size="26" fill="#e9efe4" text-anchor="middle">${labels.bottomSub}</text>
  </g>`;
}

// Separate goods-focused artwork for each locale that already has a legacy
// photographic base slide. Each file embeds only its own locale's language
// (plus the "Kafil" proper noun shared by every locale) and pairs a headline
// with the goods panel, matching the slide-2 accessibility description.
const localeSecondSlides = [
  {
    file: "hero-family_en-02.png",
    svg: spanishSlide({
      caps: "ACCOUNTABLE FAMILY SPONSORSHIP",
      eyebrow: "Support in goods, never opaque transfers.",
      line1: "Real goods.",
      line2: "Real impact.",
      right: goodsBoxes({
        singleInitial: "R",
        single: "Rice",
        oil: "Oil",
        bottomTitle: "Milk · Lentils · Flour",
        bottomSub: "Approved, auditable purchases",
      }),
      footer: "Kafil · real goods, real impact",
    }),
  },
  {
    file: "hero-family_fr-02.png",
    svg: spanishSlide({
      caps: "PARRAINAGE FAMILIAL RESPONSABLE",
      eyebrow: "Un soutien en biens, jamais de transferts opaques.",
      // French is materially wider than the other localized headlines. Keep
      // its two lines inside the text column instead of colliding with the
      // goods panel that begins at x=890.
      headlineSize: 58,
      line1: "Des biens réels.",
      line2: "Un impact réel.",
      right: goodsBoxes({
        singleInitial: "R",
        single: "Riz",
        oil: "Huile",
        bottomTitle: "Lait · Lentilles · Farine",
        bottomSub: "Achats approuvés et auditables",
      }),
      footer: "Kafil · des biens réels, un impact réel",
    }),
  },
  {
    file: "hero-family_ar-02.png",
    svg: spanishSlide({
      caps: "كفالة أسرية مسؤولة",
      eyebrow: "دعم بالسلع، لا تحويلات غامضة.",
      line1: "سلع حقيقية.",
      line2: "أثر حقيقي.",
      right: goodsBoxes({
        singleInitial: "أ",
        single: "أرز",
        oil: "زيت",
        bottomTitle: "حليب · عدس · دقيق",
        bottomSub: "مشتريات معتمدة وقابلة للتدقيق",
      }),
      footer: "Kafil · سلع حقيقية، أثر حقيقي",
    }),
  },
];

const slides = [
  {
    file: "hero-family_es.png",
    svg: spanishSlide({
      eyebrow: "Necesidades revisadas, entregas con evidencia.",
      line1: "Familias más fuertes.",
      line2: "Mañanas más brillantes.",
      right: checklistCard(["Familia identificada", "Necesidades evaluadas", "Pedido entregado"]),
    }),
  },
  {
    file: "hero-family_es-02.png",
    svg: spanishSlide({
      eyebrow: "Apoyo en bienes, nunca transferencias opacas.",
      line1: "Bienes reales.",
      line2: "Impacto real.",
      right: goodsBoxes(),
    }),
  },
];

for (const slide of [...localeSecondSlides, ...slides]) {
  const out = join(heroDir, slide.file);
  const before = existsSync(out) ? sha256(out).slice(0, 12) : "missing";
  await sharp(Buffer.from(slide.svg)).png().toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`${slide.file}: ${meta.width}x${meta.height} sha=${sha256(out).slice(0, 12)} (was ${before})`);
}
