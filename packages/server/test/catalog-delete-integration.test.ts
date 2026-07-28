import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

import { server } from "../src";
import { envConfig } from "../src/config/envConfig";
import {
  CatalogService,
} from "../src/modules/catalog";
import { CATEGORY_IMAGE_SERVE_PREFIX } from "../src/modules/catalog/categoryImageController";
import { PRODUCT_IMAGE_SERVE_PREFIX } from "../src/modules/catalog/productImageController";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

const ids = {
  family: crypto.randomUUID(),
  cart: crypto.randomUUID(),
  deleteCategory: crypto.randomUUID(),
  deleteCategoryProduct: crypto.randomUUID(),
  productCategory: crypto.randomUUID(),
  pristineProduct: crypto.randomUUID(),
  orderedProduct: crypto.randomUUID(),
  rollbackProduct: crypto.randomUUID(),
  order: crypto.randomUUID(),
  orderItem: crypto.randomUUID(),
};

const categoryImageName = `${crypto.randomUUID()}.png`;
const productImageName = `${crypto.randomUUID()}.png`;
const categoryImagePath = `${CATEGORY_IMAGE_SERVE_PREFIX}${categoryImageName}`;
const productImagePath = `${PRODUCT_IMAGE_SERVE_PREFIX}${productImageName}`;

let actorUserId = "";
let service: CatalogService;

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

databaseDescribe("catalog pristine-delete PostgreSQL integration", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.KAFIL_ADMIN_EMAIL) {
      throw new Error(
        "DATABASE_URL and KAFIL_ADMIN_EMAIL are required for database integration tests.",
      );
    }

    await server.init();
    service = server.container.get(CatalogService);

    const actor = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [process.env.KAFIL_ADMIN_EMAIL],
    );
    actorUserId = actor.rows[0]?.id ?? "";
    if (!actorUserId) {
      throw new Error("Run `bun run seed -- setup --yes` before DB tests.");
    }

    const suffix = ids.productCategory.slice(0, 8);
    await pool.query(
      `INSERT INTO family_profiles
         (id, user_id, guardian_legal_name, guardian_cin, exact_address,
          housing_situation, registration_date, support_priority,
          created_by_user_id, funding_target_minor)
       VALUES ($1, $2, 'Catalog integration', $3, 'Test-only address',
               'rented', '2026-01-15', 'normal', $2, 1000)`,
      [ids.family, actorUserId, `CAT${suffix}`],
    );
    await pool.query(
      `INSERT INTO carts (id, family_profile_id) VALUES ($1, $2)`,
      [ids.cart, ids.family],
    );
    await pool.query(
      `INSERT INTO categories (id, name, slug, image)
       VALUES
         ($1, 'Delete product fixtures', $3, NULL),
         ($2, 'Delete category fixture', $4, $5)`,
      [
        ids.productCategory,
        ids.deleteCategory,
        `delete-products-${suffix}`,
        `delete-category-${suffix}`,
        categoryImagePath,
      ],
    );
    await pool.query(
      `INSERT INTO products
       (id, category_id, sku, name, price_minor, image_url)
       VALUES
         ($1, $4, $5, 'Pristine product', 100, $8),
         ($2, $4, $6, 'Ordered product', 100, NULL),
         ($3, $4, $7, 'Rollback product', 100, NULL),
         ($9, $10, $11, 'Category cascade product', 100, $8)`,
      [
        ids.pristineProduct,
        ids.orderedProduct,
        ids.rollbackProduct,
        ids.productCategory,
        `PRI-${suffix}`,
        `ORD-${suffix}`,
        `RBK-${suffix}`,
        productImagePath,
        ids.deleteCategoryProduct,
        ids.deleteCategory,
        `CAT-${suffix}`,
      ],
    );
    await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES ($1, $2, 1), ($1, $3, 1)`,
      [
        ids.cart,
        ids.pristineProduct,
        ids.rollbackProduct,
      ],
    );
    await pool.query(
      `INSERT INTO inventory_balances
         (product_id, on_hand_quantity, reserved_quantity)
       VALUES ($1, 0, 0), ($2, 0, 0)`,
      [ids.pristineProduct, ids.deleteCategoryProduct],
    );
    await pool.query(
      `INSERT INTO orders
         (id, order_number, submission_idempotency_key, family_profile_id,
          subtotal_minor, total_minor, guardian_legal_name_snapshot,
          delivery_address_snapshot, placed_by_user_id)
       VALUES ($1, $2, $3, $4, 100, 100, 'Catalog integration',
               'Test-only address', $5)`,
      [
        ids.order,
        `CAT-${suffix}`,
        `catalog-delete-${suffix}`,
        ids.family,
        actorUserId,
      ],
    );
    await pool.query(
      `INSERT INTO order_items
         (id, order_id, product_id, product_name_snapshot, sku_snapshot,
          unit_price_minor, quantity, line_total_minor)
       VALUES ($1, $2, $3, 'Ordered product', $4, 100, 1, 100)`,
      [ids.orderItem, ids.order, ids.orderedProduct, `ORD-${suffix}`],
    );

    const categoryDirectory = join(
      envConfig.storage.basePath,
      "category-images",
    );
    const productDirectory = join(
      envConfig.storage.basePath,
      "product-images",
    );
    await mkdir(categoryDirectory, { recursive: true });
    await mkdir(productDirectory, { recursive: true });
    await writeFile(join(categoryDirectory, categoryImageName), "category");
    await writeFile(join(productDirectory, productImageName), "product");
  });

  afterAll(async () => {
    await pool
      .query(
        `DELETE FROM audit_events
         WHERE resource_id = ANY($1::text[])`,
        [[...Object.values(ids)]],
      )
      .catch(() => undefined);
    await pool
      .query(`DELETE FROM order_items WHERE order_id = $1`, [ids.order])
      .catch(() => undefined);
    await pool
      .query(`DELETE FROM orders WHERE id = $1`, [ids.order])
      .catch(() => undefined);
    await pool
      .query(`DELETE FROM cart_items WHERE cart_id = $1`, [ids.cart])
      .catch(() => undefined);
    await pool
      .query(
        `DELETE FROM inventory_balances WHERE product_id = ANY($1::uuid[])`,
        [[ids.pristineProduct, ids.deleteCategoryProduct]],
      )
      .catch(() => undefined);
    await pool
      .query(
        `DELETE FROM products WHERE category_id = ANY($1::uuid[])`,
        [[ids.productCategory, ids.deleteCategory]],
      )
      .catch(() => undefined);
    await pool
      .query(
        `DELETE FROM categories WHERE id = ANY($1::uuid[])`,
        [[ids.productCategory, ids.deleteCategory]],
      )
      .catch(() => undefined);
    await pool
      .query(`DELETE FROM carts WHERE id = $1`, [ids.cart])
      .catch(() => undefined);
    await pool
      .query(`DELETE FROM family_profiles WHERE id = $1`, [ids.family])
      .catch(() => undefined);
    await unlink(
      join(envConfig.storage.basePath, "category-images", categoryImageName),
    ).catch(() => undefined);
    await unlink(
      join(envConfig.storage.basePath, "product-images", productImageName),
    ).catch(() => undefined);
    await pool.end();
  });

  it("deletes a pristine product, its cart item, and its image", async () => {
    const result = await service.deleteProduct(
      ids.pristineProduct,
      actorUserId,
    );
    await service.cleanupImagesAfterCommit({
      deletedProductImages: result.productImageUrl
        ? [result.productImageUrl]
        : [],
    });

    const rows = await pool.query(
      `SELECT
         (SELECT count(*) FROM products WHERE id = $1)::int AS products,
         (SELECT count(*) FROM cart_items WHERE product_id = $1)::int AS cart_items,
         (SELECT count(*) FROM inventory_balances WHERE product_id = $1)::int AS inventory_balances,
         (SELECT count(*) FROM audit_events
          WHERE action = 'catalog.productDeleted' AND resource_id = $1::text)::int AS audits`,
      [ids.pristineProduct],
    );
    expect(rows.rows[0]).toEqual({
      products: 0,
      cart_items: 0,
      inventory_balances: 0,
      audits: 1,
    });
    expect(
      await exists(
        join(envConfig.storage.basePath, "product-images", productImageName),
      ),
    ).toBe(false);
  });

  it("returns 409 for order history", async () => {
    await expect(
      service.deleteProduct(ids.orderedProduct, actorUserId),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rolls back cart and product deletion when the audit write fails", async () => {
    await expect(
      service.deleteProduct(
        ids.rollbackProduct,
        "catalog-integration-missing-actor",
      ),
    ).rejects.toBeDefined();

    const rows = await pool.query(
      `SELECT
         (SELECT count(*) FROM products WHERE id = $1)::int AS products,
         (SELECT count(*) FROM cart_items WHERE product_id = $1)::int AS cart_items`,
      [ids.rollbackProduct],
    );
    expect(rows.rows[0]).toEqual({
      products: 1,
      cart_items: 1,
    });
  });

  it("cascades a pristine category and performs post-commit image cleanup", async () => {
    const result = await service.deleteCategory(
      ids.deleteCategory,
      actorUserId,
    );
    await service.cleanupImagesAfterCommit({
      categoryImagePath: result.categoryImagePath,
      deletedProductImages: result.deletedProductImages,
    });

    const rows = await pool.query(
      `SELECT
         (SELECT count(*) FROM categories WHERE id = $1)::int AS categories,
         (SELECT count(*) FROM products WHERE id = $2)::int AS products,
         (SELECT count(*) FROM cart_items WHERE product_id = $2)::int AS cart_items,
         (SELECT count(*) FROM inventory_balances WHERE product_id = $2)::int AS inventory_balances`,
      [ids.deleteCategory, ids.deleteCategoryProduct],
    );
    expect(rows.rows[0]).toEqual({
      categories: 0,
      products: 0,
      cart_items: 0,
      inventory_balances: 0,
    });
    expect(
      await exists(
        join(envConfig.storage.basePath, "category-images", categoryImageName),
      ),
    ).toBe(false);
  });
});
