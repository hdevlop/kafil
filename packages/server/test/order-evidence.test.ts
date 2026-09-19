import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getGuardMetadata } from "najm-guard";
import { getRoutes } from "najm-core";

import { KafilRoleGuard, ROLES } from "../src/config/authConfig";
import {
  evidenceReference,
  OrderEvidenceController,
  OrderEvidenceService,
  OrderPurchaseRepository,
  confirmDeliveryDto,
  recordPurchaseDto,
} from "../src/modules/orders";

const created: string[] = [];
let testStoragePath = "";

beforeAll(async () => {
  testStoragePath = await mkdtemp(join(tmpdir(), "kafil-order-evidence-"));
});

afterAll(async () => {
  await rm(testStoragePath, { force: true, recursive: true });
});

afterEach(async () => {
  for (const file of created.splice(0)) {
    await rm(file, { force: true });
  }
});

describe("protected order evidence", () => {
  it("accepts a signature-matching managed receipt and rejects spoofed content", async () => {
    const evidence = evidenceService();
    const goodName = `${crypto.randomUUID()}.pdf`;
    const badName = `${crypto.randomUUID()}.pdf`;
    created.push(
      join(receiptsDirectory(), goodName),
      join(receiptsDirectory(), badName),
    );

    const uploaded = await evidence.upload(
      "receipts",
      goodName,
      Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]).buffer,
      "application/pdf",
    );

    expect(uploaded.path).toBe(evidenceReference("receipts", goodName));
    expect((await evidence.read("receipts", goodName)).mediaType).toBe(
      "application/pdf",
    );
    await expect(
      evidence.upload(
        "receipts",
        badName,
        Uint8Array.from([1, 2, 3]).buffer,
        "application/pdf",
      ),
    ).rejects.toMatchObject({ status: 415 });
  });

  it("never deletes referenced evidence and cleans only old orphan candidates", async () => {
    const referencedName = `${crypto.randomUUID()}.pdf`;
    const orphanName = `${crypto.randomUUID()}.pdf`;
    const referencedPath = evidenceReference("receipts", referencedName);
    const evidence = evidenceService([referencedPath]);
    await mkdir(receiptsDirectory(), { recursive: true });
    for (const name of [referencedName, orphanName]) {
      await evidence.upload(
        "receipts",
        name,
        Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer,
        "application/pdf",
      );
      created.push(join(receiptsDirectory(), name));
    }
    const old = new Date(Date.now() - 48 * 60 * 60 * 1_000);
    await utimes(join(receiptsDirectory(), orphanName), old, old);

    await expect(
      evidence.removeCandidate("receipts", referencedName),
    ).rejects.toMatchObject({ status: 409 });
    expect(await evidence.cleanupOrphans()).toEqual({
      deleted: 1,
      retained: 0,
    });
    expect((await evidence.read("receipts", referencedName)).fileName).toBe(
      referencedName,
    );
  });

  it("gives Delivery accounts receipt candidates only and keeps every other evidence route operator-only", () => {
    const guardName = (method: string) =>
      getGuardMetadata(OrderEvidenceController, method)[0]?.guardClass.name;

    expect(guardName("uploadOwnReceipt")).toBe("DeliveryStaffRoleGuard");
    expect(guardName("removeOwnReceiptCandidate")).toBe("DeliveryStaffRoleGuard");
    for (const operatorOnly of [
      "upload",
      "serve",
      "removeCandidate",
      "listOrphans",
      "cleanupOrphans",
    ]) {
      expect(guardName(operatorOnly)).toBe("OperatorRoleGuard");
    }

    const deliveryRoutes = getRoutes(OrderEvidenceController).filter(
      (route) =>
        getGuardMetadata(OrderEvidenceController, String(route.methodName))[0]
          ?.guardClass.name === "DeliveryStaffRoleGuard",
    );
    expect(deliveryRoutes.map((route) => `${route.method} ${route.path}`).sort()).toEqual([
      "delete /me/receipts/:fileName",
      "post /me/receipts/:fileName",
    ]);
  });

  it("serves receipt bytes to admin and operator and to nobody else", async () => {
    const [serveGuard] = getGuardMetadata(OrderEvidenceController, "serve");
    const GuardClass = serveGuard.guardClass as new (
      roles: KafilRoleGuard,
    ) => {
      canActivate(
        user?: { id: string; role?: string | null },
      ): Promise<unknown> | unknown;
    };
    const guard = new GuardClass(new KafilRoleGuard({} as never));

    for (const role of [ROLES.ADMIN, ROLES.OPERATOR]) {
      expect(await guard.canActivate({ id: `${role}-1`, role })).toMatchObject({
        role,
      });
    }
    for (const role of [ROLES.DELIVERY, ROLES.FAMILY, ROLES.SPONSOR]) {
      expect(await guard.canActivate({ id: `${role}-1`, role })).toBe(false);
    }
    // No principal at all is denied without consulting a token service.
    expect(await guard.canActivate()).toBe(false);
  });

  it("stages and discards a Delivery receipt candidate through the same managed service", async () => {
    const evidence = evidenceService();
    const controller = new OrderEvidenceController(evidence);
    const fileName = `${crypto.randomUUID()}.pdf`;
    created.push(join(receiptsDirectory(), fileName));

    const bytes = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]).buffer;
    const uploaded = await controller.uploadOwnReceipt(
      fileName,
      bytes,
      "application/pdf",
    );

    expect(uploaded).toEqual({
      path: evidenceReference("receipts", fileName),
      mediaType: "application/pdf",
      byteSize: 6,
    });
    expect(recordPurchaseDto.shape.receiptStoragePath.safeParse(uploaded.path).success)
      .toBe(true);

    expect(await controller.removeOwnReceiptCandidate(fileName)).toEqual({
      deleted: true,
    });
  });

  it("requires complete receipt and delivery proof metadata", () => {
    expect(
      recordPurchaseDto.safeParse({
        merchantName: "Marjane",
        purchasedAt: new Date(),
        actualTotalMinor: 500,
        receiptStoragePath: evidenceReference(
          "receipts",
          `${crypto.randomUUID()}.pdf`,
        ),
        receiptMediaType: "application/pdf",
        receiptByteSize: 5,
        idempotencyKey: "purchase-evidence-0001",
      }).success,
    ).toBe(true);
    expect(
      confirmDeliveryDto.safeParse({
        confirmationMethod: "photo",
        idempotencyKey: "delivery-evidence-0001",
      }).success,
    ).toBe(false);
  });
});

function evidenceService(referenced: string[] = []) {
  const previousStoragePath = process.env.KAFIL_STORAGE_PATH;
  process.env.KAFIL_STORAGE_PATH = testStoragePath;
  try {
    return new OrderEvidenceService({
      isReceiptReferenced: async (path: string) => referenced.includes(path),
      isDeliveryProofReferenced: async (path: string) => referenced.includes(path),
      listReferencedEvidencePaths: async () => referenced,
    } as unknown as OrderPurchaseRepository);
  } finally {
    if (previousStoragePath === undefined) {
      delete process.env.KAFIL_STORAGE_PATH;
    } else {
      process.env.KAFIL_STORAGE_PATH = previousStoragePath;
    }
  }
}

function receiptsDirectory() {
  return join(testStoragePath, "order-evidence", "receipts");
}
