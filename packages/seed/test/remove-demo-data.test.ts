import { describe, expect, it } from "bun:test";
import { join } from "node:path";

import {
  DEMO_SCOPE_SQL,
  DEMO_STORAGE_SQL,
  DEMO_SUMMARY_SQL,
  managedDemoFilePath,
  REMOVE_DEMO_SQL,
  removeDemoData,
  removeManagedDemoFiles,
} from "../src/remove-demo-data";

function fakePool(failOn?: string) {
  const queries: string[] = [];
  let releases = 0;

  return {
    get releases() {
      return releases;
    },
    queries,
    pool: {
      async connect() {
        return {
          async query(sql: string) {
            queries.push(sql);
            if (sql === failOn) throw new Error("database failure");
            if (sql === DEMO_SUMMARY_SQL) {
              return {
                rows: [
                  {
                    contributions: 100,
                    families: 10,
                    operators: 2,
                    orders: 1,
                    sponsors: 20,
                  },
                ],
              };
            }
            if (sql === DEMO_STORAGE_SQL) {
              return {
                rows: [
                  {
                    reference:
                      "/api/family-images/files/serve/00000000-0000-4000-8000-000000000001.webp",
                  },
                ],
              };
            }
            return { rows: [] };
          },
          release() {
            releases += 1;
          },
        };
      },
    },
  };
}

describe("managed demo cleanup", () => {
  it("scopes deterministic demo identities and their linked activity", () => {
    const scope = DEMO_SCOPE_SQL.join("\n");
    const removal = REMOVE_DEMO_SQL.join("\n");

    expect(scope).toContain("@demo.kafil.test");
    expect(scope).toContain("KAFIL-DEMO-%");
    expect(scope).toContain("demo-assisted-order:%");
    expect(removal).toContain("DELETE FROM contributions");
    expect(removal).toContain("DELETE FROM users");
    expect(removal).not.toContain("TRUNCATE");
  });

  it("removes the scoped graph transactionally, then its managed files", async () => {
    const fake = fakePool();
    const removed: string[] = [];
    const result = await removeDemoData(
      fake.pool,
      "C:/kafil-storage",
      async (path) => {
        removed.push(path);
      },
    );

    expect(fake.queries).toEqual([
      "BEGIN",
      ...DEMO_SCOPE_SQL,
      DEMO_SUMMARY_SQL,
      DEMO_STORAGE_SQL,
      ...REMOVE_DEMO_SQL,
      "COMMIT",
    ]);
    expect(result).toEqual({
      contributions: 100,
      families: 10,
      files: 1,
      operators: 2,
      orders: 1,
      sponsors: 20,
    });
    expect(removed).toEqual([
      join(
        "C:/kafil-storage",
        "family-images",
        "00000000-0000-4000-8000-000000000001.webp",
      ),
    ]);
    expect(fake.releases).toBe(1);
  });

  it("rolls back and keeps files when database cleanup fails", async () => {
    const fake = fakePool(REMOVE_DEMO_SQL[0]);
    const removed: string[] = [];

    await expect(
      removeDemoData(fake.pool, "C:/kafil-storage", async (path) => {
        removed.push(path);
      }),
    ).rejects.toThrow("database failure");

    expect(fake.queries.at(-1)).toBe("ROLLBACK");
    expect(removed).toEqual([]);
    expect(fake.releases).toBe(1);
  });

  it("accepts only managed UUID file references and deduplicates them", async () => {
    const reference =
      "/api/order-evidence/receipts/serve/10000000-0000-4000-8000-000000000001.pdf";
    const removed: string[] = [];

    expect(managedDemoFilePath("https://example.test/file.pdf", "storage")).toBe(
      undefined,
    );
    expect(
      managedDemoFilePath(
        "/api/family-images/files/serve/../../secret.txt",
        "storage",
      ),
    ).toBeUndefined();
    expect(
      await removeManagedDemoFiles(
        [reference, reference, "https://example.test/file.pdf"],
        "storage",
        async (path) => {
          removed.push(path);
        },
      ),
    ).toBe(1);
    expect(removed).toEqual([
      join(
        "storage",
        "order-evidence/receipts",
        "10000000-0000-4000-8000-000000000001.pdf",
      ),
    ]);
  });
});
