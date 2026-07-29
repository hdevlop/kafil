export interface CategorySeedFixture {
  description: string;
  fileName: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export const CATEGORY_SEED_FIXTURES: readonly CategorySeedFixture[] = [
  { name: "Fresh Produce", slug: "fresh-produce", description: "Fresh fruits, vegetables, and everyday produce.", fileName: "fresh-produce.webp", sortOrder: 10 },
  { name: "Meat & Poultry", slug: "meat-poultry", description: "Fresh meat, poultry, and family-size protein essentials.", fileName: "meat-poultry.webp", sortOrder: 20 },
  { name: "Seafood", slug: "seafood", description: "Fish, shellfish, and other seafood products.", fileName: "seafood.webp", sortOrder: 30 },
  { name: "Deli & Processed Meats", slug: "deli-processed-meats", description: "Deli meats, cold cuts, sausages, and prepared meat products.", fileName: "deli-processed-meats.webp", sortOrder: 40 },
  { name: "Bread & Bakery", slug: "bread-bakery", description: "Bread, rolls, pastries, and other bakery staples.", fileName: "bread-bakery.webp", sortOrder: 50 },
  { name: "Dairy Products", slug: "dairy-products", description: "Milk, cheese, yogurt, and other dairy essentials.", fileName: "dairy-products.webp", sortOrder: 60 },
  { name: "Beverages", slug: "beverages", description: "Water, juices, hot drinks, and soft drinks.", fileName: "beverages.webp", sortOrder: 70 },
  { name: "Baby Products", slug: "baby-products", description: "Diapers, feeding supplies, toiletries, and baby essentials.", fileName: "baby-products.webp", sortOrder: 80 },
  { name: "Personal Care & Hygiene", slug: "personal-care-hygiene", description: "Personal hygiene, grooming, and everyday care products.", fileName: "personal-care-hygiene.webp", sortOrder: 90 },
  { name: "Cleaning Supplies", slug: "cleaning-supplies", description: "Laundry, dishwashing, and household cleaning supplies.", fileName: "cleaning-supplies.webp", sortOrder: 100 },
  { name: "Clothing & Footwear", slug: "clothing-footwear", description: "Everyday clothing, shoes, and seasonal wear.", fileName: "clothing-footwear.webp", sortOrder: 110 },
  { name: "School Supplies", slug: "school-supplies", description: "Notebooks, stationery, art materials, and classroom essentials.", fileName: "school-supplies.webp", sortOrder: 120 },
  { name: "Toys", slug: "toys", description: "Children's toys, games, and age-appropriate play essentials.", fileName: "toys.webp", sortOrder: 130 },
  { name: "Kitchen & Home", slug: "kitchen-home", description: "Cookware, utensils, small appliances, and household essentials.", fileName: "kitchen-home.webp", sortOrder: 140 },
  { name: "Home Improvement", slug: "home-improvement", description: "Home maintenance, lighting, repair, and improvement supplies.", fileName: "home-improvement.webp", sortOrder: 150 },
  { name: "Hand Tools", slug: "hand-tools", description: "Hand tools, power tools, and practical repair equipment.", fileName: "hand-tools.webp", sortOrder: 160 },
  { name: "Electronics", slug: "electronics", description: "Phones, computers, accessories, and consumer electronics.", fileName: "electronics.webp", sortOrder: 170 },
  { name: "Pet Supplies", slug: "pet-supplies", description: "Pet food, hygiene products, accessories, and care supplies.", fileName: "pet-supplies.webp", sortOrder: 180 },
];

const CATEGORY_SEED_IMAGE_NAMES = new Set(
  CATEGORY_SEED_FIXTURES.map((fixture) => fixture.fileName.toLowerCase()),
);

export function isCategorySeedImageName(fileName: string) {
  return CATEGORY_SEED_IMAGE_NAMES.has(fileName.toLowerCase());
}
