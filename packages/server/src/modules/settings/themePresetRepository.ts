import { asc, count, desc, eq } from "drizzle-orm";
import type { NajmDesignConfig } from "najm-kit";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { themePresets } from "./themePresetSchema";

export interface ThemePresetWrite {
  slug: string;
  name: string;
  designConfig: NajmDesignConfig;
  isBuiltIn?: boolean;
  createdByUserId: string | null;
}

const themePresetSelection = {
  id: themePresets.id,
  slug: themePresets.slug,
  name: themePresets.name,
  designConfig: themePresets.designConfig,
  isBuiltIn: themePresets.isBuiltIn,
  createdAt: themePresets.createdAt,
};

@Repository("default")
export class ThemePresetRepository {
  @DB() private db!: KafilDatabase;

  /** Built-in presets first, then the admin's own presets alphabetically. */
  async list() {
    return this.db
      .select(themePresetSelection)
      .from(themePresets)
      .orderBy(desc(themePresets.isBuiltIn), asc(themePresets.name));
  }

  async findById(id: string) {
    const [preset] = await this.db
      .select(themePresetSelection)
      .from(themePresets)
      .where(eq(themePresets.id, id))
      .limit(1);
    return preset;
  }

  async findBySlug(slug: string) {
    const [preset] = await this.db
      .select(themePresetSelection)
      .from(themePresets)
      .where(eq(themePresets.slug, slug))
      .limit(1);
    return preset;
  }

  async count() {
    const [row] = await this.db
      .select({ total: count() })
      .from(themePresets);
    return row?.total ?? 0;
  }

  async insert(input: ThemePresetWrite) {
    const [preset] = await this.db
      .insert(themePresets)
      .values({
        slug: input.slug,
        name: input.name,
        designConfig: input.designConfig,
        isBuiltIn: input.isBuiltIn ?? false,
        createdByUserId: input.createdByUserId,
      })
      .returning(themePresetSelection);
    return preset;
  }

  async delete(id: string) {
    const [preset] = await this.db
      .delete(themePresets)
      .where(eq(themePresets.id, id))
      .returning(themePresetSelection);
    return preset;
  }
}
