import {
  AuthService,
  TokenService,
  UserRepository,
  UserService,
} from "najm-auth";
import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { generateInitialPassword } from "../access/initialPassword";
import { AuditService } from "../audit/auditService";
import {
  type BulkDeleteStaffDto,
  bulkDeleteStaffDto,
  type CreateStaffDto,
  createStaffDto,
  type ProvisionOperatorAccessDto,
  provisionOperatorAccessDto,
  type StaffIdParams,
  staffIdParams,
  type StaffListQuery,
  staffListQuery,
  type StaffStatusDto,
  staffStatusDto,
  type UpdateStaffDto,
  updateStaffDto,
} from "./staffDto";
import {
  STAFF_FUNCTION_KEYS,
  type StaffFunctionKey,
} from "./staffFunctions";
import {
  type StaffRecord,
  StaffRepository,
} from "./staffRepository";
import { StaffValidator } from "./staffValidator";

const OPERATOR_ROLE = "operator";

const PRIVATE_AUDIT_DENYLIST = new Set([
  "cin",
  "address",
  "dateOfBirth",
  "phone",
  "notes",
  "contactEmail",
  "image",
]);

@Service()
export class StaffService {
  constructor(
    private readonly staff: StaffRepository,
    private readonly auth: AuthService,
    private readonly users: UserService,
    private readonly validator: StaffValidator,
    private readonly audits: AuditService,
    private readonly tokens?: TokenService,
    private readonly userRecords?: UserRepository,
  ) {}

  async list(query: StaffListQuery) {
    const {
      limit,
      offset,
      search,
      status,
      affiliation,
      functionKey,
      hasAccess,
      sortBy,
      sortDirection,
    } =
      staffListQuery.parse(query ?? {});
    const result = await this.staff.listWithCounts(
      {
        affiliation,
        functionKey,
        hasAccess,
        search,
        status,
      },
      limit,
      offset,
      sortBy,
      sortDirection,
    );
    return { items: result.rows, total: result.total, limit, offset };
  }

  async listDeliveryOptions() {
    return this.staff.listDeliveryOptions();
  }

  async listOperatorOptions() {
    return this.staff.listOperatorOptions();
  }

  async get(id: string) {
    return this.validator.ensureExists(id);
  }

  @Transaction({ retries: 2 })
  async create(data: CreateStaffDto, actorUserId: string) {
    return this.createInternal(data, actorUserId);
  }

  @Transaction({ retries: 2 })
  async createWithUserId(
    data: CreateStaffDto & { userId?: string },
    actorUserId: string,
  ) {
    return this.createInternal(data, actorUserId, { userId: data.userId });
  }

  private async createInternal(
    data: CreateStaffDto & { userId?: string },
    actorUserId: string,
    options: { userId?: string } = {},
  ) {
    const input = createStaffDto.parse(data);
    const functionKeys = input.functions as StaffFunctionKey[];
    await this.validator.ensureIdUnique(input.id);
    await this.validator.ensurePhoneUnique(input.phone);
    await this.validator.ensureCinUnique(input.cin);

    const wantsOperator = functionKeys.includes("operator");
    const createOperatorAccess = input.createOperatorAccess === true;

    if (!createOperatorAccess) {
      await this.validator.ensureEmailUnique(input.contactEmail);
    }

    const profile = await this.staff.createProfile({
      id: input.id,
      name: input.name,
      contactEmail: input.contactEmail ?? null,
      phone: input.phone,
      image: input.image ?? null,
      affiliation: input.affiliation,
      companyName:
        input.affiliation === "external" ? input.companyName ?? null : null,
      cin: input.cin ?? null,
      gender: input.gender ?? null,
      address: input.address ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      jobTitle: input.jobTitle ?? null,
      status: "active",
      notes: input.notes ?? null,
      userId: null,
    });

    await this.staff.setFunctions(profile!.id, functionKeys);

    let createdWithAccess: Awaited<ReturnType<typeof this.staff.findById>>;
    let initialPassword: string | null = null;
    try {
      if (wantsOperator && createOperatorAccess) {
        const accessEmail =
          input.createOperatorAccessEmail ?? input.contactEmail;
        const result = await this.provisionOperatorAccessInternal(
          profile!.id,
          { email: accessEmail! },
          actorUserId,
          options.userId,
        );
        createdWithAccess = result.profile;
        initialPassword = result.initialPassword;
      } else {
        createdWithAccess = await this.staff.findById(profile!.id);
      }
      await this.recordAudit(
        "staff.created",
        actorUserId,
        profile!.id,
        {
          functions: functionKeys,
          affiliation: input.affiliation,
          hasAccount: Boolean(initialPassword),
        },
      );
    } catch (error) {
      if (initialPassword === null) {
        await this.staff.deleteProfile(profile!.id).catch(() => undefined);
      }
      throw error;
    }

    return {
      ...createdWithAccess!,
      initialPassword,
    } satisfies StaffRecord & { initialPassword: string | null };
  }

  @Transaction({ retries: 2 })
  async update(id: string, data: UpdateStaffDto, actorUserId: string) {
    const existing = await this.validator.ensureExists(id);
    const input = updateStaffDto.parse(data);
    const functionKeys = (input.functions ?? existing.functions) as StaffFunctionKey[];
    const wantsOperator = functionKeys.includes("operator");
    await this.validator.ensurePhoneUnique(input.phone, id, existing.userId ?? undefined);
    await this.validator.ensureCinUnique(input.cin, id);
    await this.validator.ensureEmailUnique(input.contactEmail, existing.userId ?? undefined);
    await this.validator.ensureCanRemoveOperatorFunction(id, functionKeys);

    const accountUpdates: Record<string, unknown> = {};
    if (existing.userId) {
      if (input.name && input.name !== existing.name) {
        accountUpdates.name = input.name;
      }
      if (
        input.contactEmail !== undefined &&
        input.contactEmail !== existing.contactEmail
      ) {
        accountUpdates.email = input.contactEmail;
      }
    }

    const companyName =
      !wantsOperator && (input.affiliation ?? existing.affiliation) === "external"
        ? input.companyName ?? existing.companyName ?? null
        : null;

    await this.staff.updateProfile(id, {
      name: input.name ?? existing.name,
      contactEmail:
        input.contactEmail !== undefined
          ? input.contactEmail ?? null
          : existing.contactEmail,
      phone: input.phone ?? existing.phone,
      image:
        input.image !== undefined
          ? input.image ?? null
          : existing.image,
      affiliation: wantsOperator ? "internal" : input.affiliation ?? existing.affiliation,
      companyName,
      cin: input.cin !== undefined ? input.cin ?? null : existing.cin,
      gender: input.gender !== undefined ? input.gender ?? null : existing.gender,
      address:
        input.address !== undefined ? input.address ?? null : existing.address,
      dateOfBirth:
        input.dateOfBirth !== undefined
          ? input.dateOfBirth ?? null
          : existing.dateOfBirth,
      jobTitle:
        input.jobTitle !== undefined ? input.jobTitle ?? null : existing.jobTitle,
      notes:
        input.notes !== undefined ? input.notes ?? null : existing.notes,
    });

    await this.staff.setFunctions(id, functionKeys);

    if (Object.keys(accountUpdates).length > 0 && existing.userId) {
      await this.users.update(existing.userId, accountUpdates);
    }
    if (existing.userId && input.phone !== undefined && input.phone !== existing.phone) {
      await this.userRecords?.update(existing.userId, {
        phone: input.phone,
        phoneVerified: false,
      });
    }

    await this.recordAudit("staff.updated", actorUserId, id, {
      functions: functionKeys,
      affiliation: input.affiliation ?? existing.affiliation,
    });

    return this.validator.ensureExists(id);
  }

  @Transaction({ retries: 2 })
  async deactivate(id: string, data: StaffStatusDto, actorUserId: string) {
    return this.changeStatus(id, "inactive", data, actorUserId);
  }

  @Transaction({ retries: 2 })
  async reactivate(id: string, data: StaffStatusDto, actorUserId: string) {
    return this.changeStatus(id, "active", data, actorUserId);
  }

  @Transaction({ retries: 2 })
  async provisionOperatorAccess(
    id: string,
    data: ProvisionOperatorAccessDto,
    actorUserId: string,
  ) {
    const body = provisionOperatorAccessDto.parse(data);
    const profile = await this.validator.ensureExists(id);
    if (!profile.functions.includes("operator")) {
      HttpError.conflict(
        "Operator function is required to provision an operator account",
      );
    }
    if (profile.affiliation !== "internal") {
      HttpError.conflict("External staff cannot receive a Kafil operator account");
    }
    if (profile.userId) {
      HttpError.conflict("Staff profile already has an application account");
    }
    return this.provisionOperatorAccessInternal(id, body, actorUserId);
  }

  @Transaction({ retries: 2 })
  async deletePristine(id: string, actorUserId: string) {
    const params = staffIdParams.parse({ id });
    const isPristine = await this.staff.isPristine(params.id);
    if (!isPristine) {
      HttpError.conflict(
        "Staff records with order history must be deactivated instead",
      );
    }
    const existing = await this.staff.deleteProfile(params.id);
    if (!existing) {
      HttpError.notFound("Staff profile not found");
    }
    if (existing.userId) {
      await this.users.delete(existing.userId);
    }
    await this.recordAudit("staff.deleted", actorUserId, params.id, {
      permanent: true,
    });
    return existing;
  }

  @Transaction({ retries: 2 })
  async deletePristineMany(data: BulkDeleteStaffDto, actorUserId: string) {
    const body = bulkDeleteStaffDto.parse(data);
    const pristine = await this.staff.listPristineIds(body.ids);
    const rejected = body.ids.filter((id) => !pristine.has(id));
    if (rejected.length > 0) {
      HttpError.conflict(
        "Selected staff records with order history must be deactivated instead",
      );
    }
    const deleted = [];
    for (const id of [...body.ids].sort()) {
      const existing = await this.staff.deleteProfile(id);
      if (existing) {
        if (existing.userId) {
          await this.users.delete(existing.userId);
        }
        await this.recordAudit("staff.deleted", actorUserId, id, {
          permanent: true,
          bulk: true,
        });
        deleted.push(existing);
      }
    }
    return deleted;
  }

  private async provisionOperatorAccessInternal(
    staffProfileId: string,
    body: ProvisionOperatorAccessDto,
    actorUserId: string,
    providedUserId?: string,
  ): Promise<{
    initialPassword: string;
    profile: StaffRecord;
  }> {
    const profile = await this.validator.ensureExists(staffProfileId);
    await this.validator.ensureEmailUnique(body.email, profile.userId ?? undefined);

    const initialPassword = generateInitialPassword(
      profile.name,
      profile.dateOfBirth ?? "1990-01-01",
    );

    const user = await this.auth.provisionUser({
      ...(providedUserId ? { id: providedUserId } : {}),
      name: profile.name,
      email: body.email,
      role: OPERATOR_ROLE,
      password: initialPassword,
      image: profile.image ?? undefined,
    });
    await this.userRecords?.update(user.id, {
      phone: profile.phone,
      phoneVerified: false,
      emailVerified: true,
    });

    await this.staff.updateProfile(staffProfileId, {
      contactEmail: body.email,
      userId: user.id,
    });
    const updated = await this.staff.findById(staffProfileId);
    await this.recordAudit(
      "staff.operator_access_provisioned",
      actorUserId,
      staffProfileId,
      {
        functions: updated?.functions ?? profile.functions,
      },
    );
    return {
      initialPassword,
      profile: updated!,
    };
  }

  private async changeStatus(
    id: string,
    status: "active" | "inactive",
    data: StaffStatusDto,
    actorUserId: string,
  ) {
    const body = staffStatusDto.parse(data);
    const profile = await this.validator.ensureExists(id);
    await this.staff.updateProfile(id, { status });
    if (profile.userId) {
      await this.users.update(profile.userId, { status });
      if (status === "inactive") {
        await this.tokens?.invalidateUserAccessTokens(profile.userId);
        await this.tokens?.revokeAllForUser(profile.userId);
      } else {
        await this.tokens?.invalidateUserAccessTokens(profile.userId);
      }
    }
    await this.recordAudit(
      status === "active" ? "staff.reactivated" : "staff.deactivated",
      actorUserId,
      id,
      {
        reason: body.reason,
      },
    );
    return this.validator.ensureExists(id);
  }

  private async recordAudit(
    action: string,
    actorUserId: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (PRIVATE_AUDIT_DENYLIST.has(key)) continue;
      sanitized[key] = value;
    }
    await this.audits.record({
      action,
      actorUserId,
      metadata: sanitized,
      resource: "staff",
      resourceId,
    });
  }
}

export type { StaffFunctionKey };
export { STAFF_FUNCTION_KEYS };
export type { StaffListQuery, StaffIdParams };
