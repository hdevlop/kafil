import {
  DEFAULT_DEMO_IMAGE_LIBRARY_PATH,
  readDemoImageLibrary,
} from "../../demo-images";

const library = await readDemoImageLibrary();

console.log(`Seed image library: ${DEFAULT_DEMO_IMAGE_LIBRARY_PATH}`);
for (const [kind, images] of Object.entries(library)) {
  console.log(`${kind}: ${images.length} image${images.length === 1 ? "" : "s"}`);
  for (const image of images) console.log(`  ${image}`);
}
