import { describe, expect, it } from "bun:test";
import { getGuardMetadata } from "najm-guard";
import { getMcpTools } from "najm-mcp";

import { AuditService } from "../src/modules/audit";
import {
  CatalogController,
  CatalogService,
  CatalogValidator,
  createProductDto,
  ProductRepository,
} from "../src/modules/catalog";
import { CategoryRepository } from "../src/modules/catalog/catalogRepository";

const productId = "00000000-0000-4000-8000-000000000071";

describe("Phase 4 catalog contracts", () => {
  it("validates minor-unit prices", () => {
    expect(
      createProductDto.safeParse({
        categoryId: "00000000-0000-4000-8000-000000000072",
        sku: "RICE-5KG",
        name: "Rice 5kg",
        priceMinor: 99.5,
      }).success,
    ).toBe(false);
    expect(
      createProductDto.parse({
        categoryId: "00000000-0000-4000-8000-000000000072",
        sku: "RICE-5KG",
        name: "Rice 5kg",
        priceMinor: "3500",
      }).priceMinor,
    ).toBe(3500);
  });

  it("exposes lifecycle and admin-only pristine delete commands without stock commands", () => {
    const methods = getMcpTools(CatalogController).map((tool) => tool.methodKey);
    expect(methods).toContain("deactivateProduct");
    expect(methods).toContain("deleteCategory");
    expect(methods).toContain("deleteProduct");
    expect(methods).not.toContain("restock");
    expect(methods).not.toContain("adjustInventory");
  });

  it("requires both the bootstrap admin role and delete:catalog permission", () => {
    for (const method of ["deleteCategory", "deleteProduct"]) {
      const guards = getGuardMetadata(CatalogController, method);
      expect(guards.map(({ guardClass }) => guardClass.name)).toEqual([
        "AdminRoleGuard",
        "AuthGuard",
        "PermissionGuard",
      ]);
      expect(guards.at(-1)?.params).toBe("delete:catalog");
    }
  });
});

describe("Phase 4 procurement-on-demand catalog deletion", () => {
  it("hard-deletes a pristine product without any inventory balance", async () => {
    const deletedCartItems: string[][] = [];
    const deletedProducts: string[] = [];
    const auditEvents: Record<string, unknown>[] = [];

    const service = new CatalogService(
      {} as CategoryRepository,
      {
        findById: async () => ({
          id: productId,
          categoryId: "00000000-0000-4000-8000-000000000072",
          sku: "PROC-1",
          name: "Procurement product",
          description: null,
          priceMinor: 1000,
          currency: "MAD",
          imageUrl: null,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        deleteCartItemsByProductIds: async (ids: string[]) => {
          deletedCartItems.push([...ids]);
          return ids.length;
        },
        countOrderItemsByProductIds: async () => 0,
        hardDelete: async (id: string) => {
          deletedProducts.push(id);
          return {
            id,
            categoryId: "00000000-0000-4000-8000-000000000072",
            sku: "PROC-1",
            name: "Procurement product",
            description: null,
            priceMinor: 1000,
            currency: "MAD",
            imageUrl: null,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
      } as unknown as ProductRepository,
      { record: async (input: unknown) => {
          auditEvents.push(input as Record<string, unknown>);
          return input;
        } } as unknown as AuditService,
      {
        ensureProductExists: async () => ({
          id: productId,
          categoryId: "00000000-0000-4000-8000-000000000072",
          sku: "PROC-1",
          name: "Procurement product",
          description: null,
          priceMinor: 1000,
          currency: "MAD",
          imageUrl: null,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        ensureProductPristine: async () => undefined,
      } as unknown as CatalogValidator,
    );

    const result = await service.deleteProduct(productId, "admin-user");

    expect(deletedCartItems).toEqual([[productId]]);
    expect(deletedProducts).toEqual([productId]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "catalog.productDeleted",
        actorUserId: "admin-user",
        metadata: { permanent: true },
        resource: "products",
        resourceId: productId,
      }),
    ]);
    expect(result).toEqual({
      productId,
      categoryId: "00000000-0000-4000-8000-000000000072",
      productImageUrl: null,
    });
  });
});
