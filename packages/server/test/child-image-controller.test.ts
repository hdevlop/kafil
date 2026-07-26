import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FamilyRepository } from "../src/modules/families/familyRepository";
import { ChildImageAccess } from "../src/modules/children/childImageController";
import { ChildRepository } from "../src/modules/children/childRepository";

const imagePath = "/api/child-images/files/serve/00000000-0000-4000-8000-000000000099.png";
const childId = "00000000-0000-4000-8000-000000000099";
const familyId = "00000000-0000-4000-8000-000000000098";
const otherFamilyId = "00000000-0000-4000-8000-000000000097";
const fileName = "00000000-0000-4000-8000-000000000099.png";

describe("ChildImageAccess", () => {
  let originalBasePath: string | undefined;
  let temporaryDirectory: string;
  let children: ChildRepository;
  let families: FamilyRepository;
  let access: ChildImageAccess;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "kafil-child-images-"));
    originalBasePath = process.env.KAFIL_STORAGE_PATH;
    process.env.KAFIL_STORAGE_PATH = temporaryDirectory;
    children = {
      findByImagePath: async (path: string) =>
        path === imagePath
          ? { id: childId, familyProfileId: familyId, image: imagePath }
          : undefined,
    } as unknown as ChildRepository;
    families = {
      findByUserId: async (userId: string) => {
        if (userId === "owning-family-user") {
          return { id: familyId, role: "family" };
        }
        if (userId === "other-family-user") {
          return { id: otherFamilyId, role: "family" };
        }
        return undefined;
      },
    } as unknown as FamilyRepository;
    access = new ChildImageAccess(children, families);
  });

  afterEach(async () => {
    if (originalBasePath === undefined) {
      delete process.env.KAFIL_STORAGE_PATH;
    } else {
      process.env.KAFIL_STORAGE_PATH = originalBasePath;
    }
    await rm(temporaryDirectory, { force: true, recursive: true });
  });

  it("rejects unauthenticated requests", async () => {
    await expect(access.resolveImage(fileName, null)).rejects.toThrow(
      "Child image access denied",
    );
  });

  it("rejects sponsors even with the correct filename", async () => {
    await expect(
      access.resolveImage(fileName, { role: "sponsor", userId: "sponsor-user" }),
    ).rejects.toThrow("Child image access denied");
  });

  it("allows admins regardless of family ownership", async () => {
    const result = await access.resolveImage(fileName, {
      role: "admin",
      userId: "admin-user",
    });
    expect(result.fileName).toBe(fileName);
  });

  it("allows operators regardless of family ownership", async () => {
    const result = await access.resolveImage(fileName, {
      role: "operator",
      userId: "operator-user",
    });
    expect(result.fileName).toBe(fileName);
  });

  it("allows the owning family", async () => {
    const result = await access.resolveImage(fileName, {
      role: "family",
      userId: "owning-family-user",
    });
    expect(result.fileName).toBe(fileName);
  });

  it("rejects a different family even with the correct filename", async () => {
    await expect(
      access.resolveImage(fileName, {
        role: "family",
        userId: "other-family-user",
      }),
    ).rejects.toThrow("Child image access denied");
  });

  it("rejects an unknown child image filename", async () => {
    await expect(
      access.resolveImage("not-a-uuid.png", {
        role: "admin",
        userId: "admin-user",
      }),
    ).rejects.toThrow("Invalid child image file name");
  });

  it("returns not found when no child references the filename", async () => {
    const orphanAccess = new ChildImageAccess(
      {
        findByImagePath: async () => undefined,
      } as unknown as ChildRepository,
      families,
    );
    await expect(
      orphanAccess.resolveImage(fileName, {
        role: "admin",
        userId: "admin-user",
      }),
    ).rejects.toThrow("Child image not found");
  });

  it("serves the bytes from managed storage when authorized", async () => {
    const filePath = join(temporaryDirectory, "child-images", fileName);
    await mkdir(join(temporaryDirectory, "child-images"), { recursive: true });
    await writeFile(filePath, "child-bytes");
    const result = await access.resolveImage(fileName, {
      role: "operator",
      userId: "operator-user",
    });
    expect(result.directory).toBe(join(temporaryDirectory, "child-images"));
    expect(result.fileName).toBe(fileName);
  });
});
