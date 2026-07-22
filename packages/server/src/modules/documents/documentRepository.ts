import { asc, eq } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import {
  documentObjects,
  type NewDocumentObject,
} from "./documentSchema";

@Repository("default")
export class DocumentRepository {
  @DB() private db!: KafilDatabase;

  list(limit: number, offset: number, familyProfileId?: string) {
    const base = this.db
      .select()
      .from(documentObjects)
      .orderBy(asc(documentObjects.createdAt))
      .limit(limit)
      .offset(offset);

    return familyProfileId
      ? base.where(eq(documentObjects.familyProfileId, familyProfileId))
      : base;
  }

  async findById(id: string) {
    const [document] = await this.db
      .select()
      .from(documentObjects)
      .where(eq(documentObjects.id, id))
      .limit(1);
    return document;
  }

  async findByStoragePath(storagePath: string) {
    const [document] = await this.db
      .select()
      .from(documentObjects)
      .where(eq(documentObjects.storagePath, storagePath))
      .limit(1);
    return document;
  }

  async create(data: NewDocumentObject) {
    const [document] = await this.db
      .insert(documentObjects)
      .values(data)
      .returning();
    return document;
  }

  async update(
    id: string,
    data: Partial<
      Pick<NewDocumentObject, "classification" | "mediaType" | "byteSize">
    >,
  ) {
    const [document] = await this.db
      .update(documentObjects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documentObjects.id, id))
      .returning();
    return document;
  }

  async delete(id: string) {
    const [document] = await this.db
      .delete(documentObjects)
      .where(eq(documentObjects.id, id))
      .returning();
    return document;
  }
}
