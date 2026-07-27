import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, rm, utimes } from "node:fs/promises";
import { join } from "node:path";

import { envConfig } from "../src/config/envConfig";
import {
  evidenceReference,
  OrderEvidenceService,
  OrderPurchaseRepository,
  confirmDeliveryDto,
  recordPurchaseDto,
} from "../src/modules/orders";

const created: string[] = [];
const receiptsDirectory = join(
  envConfig.storage.basePath,
  "order-evidence",
  "receipts",
);

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
    created.push(join(receiptsDirectory, goodName), join(receiptsDirectory, badName));

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
    await mkdir(receiptsDirectory, { recursive: true });
    for (const name of [referencedName, orphanName]) {
      await evidence.upload(
        "receipts",
        name,
        Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer,
        "application/pdf",
      );
      created.push(join(receiptsDirectory, name));
    }
    const old = new Date(Date.now() - 48 * 60 * 60 * 1_000);
    await utimes(join(receiptsDirectory, orphanName), old, old);

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
  return new OrderEvidenceService({
    isReceiptReferenced: async (path: string) => referenced.includes(path),
    isDeliveryProofReferenced: async (path: string) => referenced.includes(path),
    listReferencedEvidencePaths: async () => referenced,
  } as unknown as OrderPurchaseRepository);
}
