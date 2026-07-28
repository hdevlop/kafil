import {
  DEFAULT_DEMO_IMAGE_LIBRARY_PATH,
  readDemoImageLibrary,
} from "../../demo-images";
import { validateCategorySeedImages } from "../../category-seed";

const library = await readDemoImageLibrary();
const categoryImages = await validateCategorySeedImages();

console.log(`Seed image library: ${DEFAULT_DEMO_IMAGE_LIBRARY_PATH}`);
console.log(
  `categories: ${categoryImages.length} image${categoryImages.length === 1 ? "" : "s"}`,
);
for (const image of categoryImages) console.log(`  ${image}`);
console.log(`family: ${library.family.length} image${library.family.length === 1 ? "" : "s"}`);
for (const image of library.family) console.log(`  ${image}`);
for (const kind of ["sponsor", "child"] as const) {
  for (const gender of ["F", "M"] as const) {
    const images = library[kind][gender];
    const label = `${kind}/${gender}`;
    console.log(
      `${label}: ${images.length} image${images.length === 1 ? "" : "s"}`,
    );
    for (const image of images) console.log(`  ${image}`);
  }
}
