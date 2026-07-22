import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { AuditService } from "../audit/auditService";
import { FamilyRepository } from "../families/familyRepository";
import {
  type ChildListQuery,
  childListQuery,
  type ChildStatusDto,
  childStatusDto,
  type CreateChildDto,
  createChildDto,
  type UpdateChildDto,
  updateChildDto,
} from "./childDto";
import { ChildRepository } from "./childRepository";
import type { ChildRecord } from "./childSchema";
import { ChildValidator } from "./childValidator";

@Service()
export class ChildService {
  constructor(
    private readonly children: ChildRepository,
    private readonly families: FamilyRepository,
    private readonly audits: AuditService,
    private readonly validator: ChildValidator,
  ) {}

  async list(query: ChildListQuery) {
    const { limit, offset, familyProfileId } = childListQuery.parse(
      query ?? {},
    );
    return this.children.list(limit, offset, familyProfileId);
  }

  get(id: string) {
    return this.validator.ensureExists(id);
  }

  async listOwn(userId: string) {
    const family = await this.families.findByUserId(userId);
    if (!family || family.role !== "family") {
      HttpError.notFound("Family profile not found");
    }
    const children = await this.children.listByFamilyId(
      family.id,
    );
    return children.map(toFamilyChildProjection);
  }

  async getOwn(id: string, userId: string) {
    const [family, child] = await Promise.all([
      this.families.findByUserId(userId),
      this.validator.ensureExists(id),
    ]);
    if (
      !family ||
      family.role !== "family" ||
      child.familyProfileId !== family.id
    ) {
      HttpError.notFound("Child not found");
    }
    return toFamilyChildProjection(child);
  }

  @Transaction({ retries: 2 })
  async create(data: CreateChildDto) {
    const input = createChildDto.parse(data);
    await this.validator.ensureFamilyExists(input.familyProfileId);
    return this.children.create({
      ...input,
      schoolLevel: input.schoolLevel ?? null,
      clothingSize: input.clothingSize ?? null,
      shoeSize: input.shoeSize ?? null,
      notes: input.notes ?? null,
    });
  }

  @Transaction({ retries: 2 })
  async update(id: string, data: UpdateChildDto) {
    await this.validator.ensureExists(id);
    const input = updateChildDto.parse(data);
    return this.children.update(id, {
      ...input,
      ...nullableUpdate(input, "schoolLevel"),
      ...nullableUpdate(input, "clothingSize"),
      ...nullableUpdate(input, "shoeSize"),
      ...nullableUpdate(input, "notes"),
    });
  }

  @Transaction({ retries: 2 })
  async delete(id: string, actorUserId: string) {
    const child = await this.validator.ensureExists(id);
    await this.children.delete(id);
    await this.audits.record({
      action: "child.deleted",
      actorUserId,
      metadata: { permanent: true },
      resource: "children",
      resourceId: child.id,
    });
    return child;
  }

  @Transaction({ retries: 2 })
  async deactivate(id: string, data: ChildStatusDto, actorUserId: string) {
    return this.changeStatus(id, "inactive", data, actorUserId);
  }

  @Transaction({ retries: 2 })
  async reactivate(id: string, data: ChildStatusDto, actorUserId: string) {
    return this.changeStatus(id, "active", data, actorUserId);
  }

  private async changeStatus(
    id: string,
    status: "active" | "inactive",
    data: ChildStatusDto,
    actorUserId: string,
  ) {
    const child = await this.validator.ensureExists(id);
    const { reason } = childStatusDto.parse(data);
    await this.children.update(id, { status });
    await this.audits.record({
      action: `child.${status === "active" ? "reactivated" : "deactivated"}`,
      actorUserId,
      metadata: { reason },
      resource: "children",
      resourceId: child.id,
    });
    return this.validator.ensureExists(id);
  }
}

function toFamilyChildProjection(child: ChildRecord) {
  const projection = { ...child };
  delete (projection as { notes?: unknown }).notes;
  return projection;
}

function nullableUpdate<
  T extends Record<string, unknown>,
  TKey extends keyof T,
>(input: T, key: TKey) {
  return key in input ? { [key]: input[key] ?? null } : {};
}
