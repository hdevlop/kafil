import { sql } from "drizzle-orm";

/** Deterministic dominant category shared by order lists and dashboards. */
export function dominantOrderCategoryField(field: "name" | "image") {
  const selectedField = field === "name"
    ? sql.raw('dominant_category."name"')
    : sql.raw('dominant_category."image"');
  return sql<string | null>`(
    SELECT ${selectedField}
    FROM "order_items" AS dominant_order_items
    INNER JOIN "products" AS dominant_products
      ON dominant_products."id" = dominant_order_items."product_id"
    INNER JOIN "categories" AS dominant_category
      ON dominant_category."id" = dominant_products."category_id"
    WHERE dominant_order_items."order_id" = "orders"."id"
    GROUP BY dominant_category."id", ${selectedField}
    ORDER BY
      SUM(dominant_order_items."quantity") DESC,
      MIN(dominant_order_items."created_at") ASC,
      dominant_category."id" ASC
    LIMIT 1
  )`;
}
