import { randomUUID } from "node:crypto";
import {
  AuthService,
  EncryptionService,
  TokenService,
  UserRepository,
  UserService,
} from "najm-auth";
import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { listPage } from "../../pagination";
import { AuditService } from "../audit/auditService";
import { BudgetAccountRepository } from "../budgets/budgetRepository";
import { BudgetService } from "../budgets/budgetService";
import { ChildRepository } from "../children/childRepository";
import { FundingService } from "../settings/fundingService";
import { SettingRepository } from "../settings/settingRepository";
import { AccessRepository } from "../access/accessRepository";
import { generateFamilyInitialPassword } from "../access/initialPassword";
import {
  type AccountStatusDto,
  accountStatusDto,
  type CreateFamilyDto,
  createFamilyDto,
  type FamilyListQuery,
  familyListQuery,
  type UpdateFamilyDto,
  updateFamilyDto,
} from "./familyDto";
import { FamilyRepository } from "./familyRepository";
import { FamilyValidator } from "./familyValidator";

const FAMILY_ROLE = "family";

@Service()
export class FamilyService {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
    private readonly families: FamilyRepository,
    private readonly children: ChildRepository,
    private readonly budgets: BudgetService,
    private readonly accounts: BudgetAccountRepository,
    private readonly audits: AuditService,
    private readonly validator: FamilyValidator,
    private readonly funding: FundingService,
    private readonly settings: SettingRepository,
    private readonly userRecords?: UserRepository,
    private readonly access?: AccessRepository,
    private readonly tokens?: TokenService,
    private readonly encryption?: EncryptionService,
  ) {}

  async list(query: FamilyListQuery) {
    const { limit, offset, search, status } = familyListQuery.parse(query ?? {});
    const [families, total] = await Promise.all([
      this.families.list(limit, offset, { search, status }),
      this.families.count({ search, status }),
    ]);
    const [fundingByFamily, activeSponsors] = await Promise.all([
      this.funding.getProgressForFamilies(families),
      this.families.listActiveSponsorsForFamilies(families.map(({ id }) => id)),
    ]);
    const activeSponsorNamesByFamily = new Map<string, string[]>();
    const seenSponsorsByFamily = new Map<string, Set<string>>();

    for (const sponsor of activeSponsors) {
      if (!sponsor.sponsorName) continue;

      const seenSponsors =
        seenSponsorsByFamily.get(sponsor.familyProfileId) ?? new Set<string>();
      if (seenSponsors.has(sponsor.sponsorProfileId)) continue;

      seenSponsors.add(sponsor.sponsorProfileId);
      seenSponsorsByFamily.set(sponsor.familyProfileId, seenSponsors);
      const names = activeSponsorNamesByFamily.get(sponsor.familyProfileId) ?? [];
      names.push(sponsor.sponsorName);
      activeSponsorNamesByFamily.set(sponsor.familyProfileId, names);
    }

    return listPage(
      families.map((family) => ({
        ...family,
        funding: fundingByFamily.get(family.id) ?? null,
        activeSponsorNames: activeSponsorNamesByFamily.get(family.id) ?? [],
      })),
      { limit, offset, total },
    );
  }

  get(id: string) {
    return this.validator.ensureExists(id);
  }

  async getOwn(userId: string) {
    const family = await this.families.findByUserId(userId);
    if (!family || family.role !== FAMILY_ROLE) {
      HttpError.notFound("Family profile not found");
    }
    return {
      id: family.id,
      userId: family.userId,
      name: family.name,
      email: family.email,
      image: family.image,
      status: family.status,
      fundingStatus: family.fundingStatus,
      fundingTargetMinor: family.fundingTargetMinor,
      fundingActivatedAt: family.fundingActivatedAt,
      relationshipToChildren: family.relationshipToChildren,
      guardianLegalName: family.guardianLegalName,
      guardianDateOfBirth: family.guardianDateOfBirth,
      exactAddress: family.exactAddress,
      housingSituation: family.housingSituation,
      registrationDate: family.registrationDate,
      supportPriority: family.supportPriority,
      phone: family.phone,
    };
  }

  @Transaction({ retries: 2 })
  async create(data: CreateFamilyDto, actorUserId: string) {
    const input = createFamilyDto.parse(data);
    const {
      id,
      userId,
      guardianCin,
      guardianDateOfBirth,
      exactAddress,
      phone,
      housingSituation,
      registrationDate,
      supportPriority,
      fundingTargetMinor: requestedFundingTargetMinor,
      initialChildren,
      relationshipToChildren,
      notes,
      ...account
    } = input;

    await this.validator.ensureIdUnique(id);
    await this.validator.ensureUserIdUnique(userId);
    await this.validator.ensureEmailUnique(account.email);
    await this.validator.ensurePhoneUnique(phone);
    await this.validator.ensureGuardianCinUnique(guardianCin);

    const fundingTargetMinor =
      requestedFundingTargetMinor ??
      (await this.settings.find())?.familyFundingTargetMinor;
    if (!fundingTargetMinor) {
      HttpError.notFound("Default family funding target not found");
    }

    const initialPassword = generateFamilyInitialPassword(guardianCin);
    const provisioningPassword = this.encryption
      ? `Kafil-${randomUUID()}-A1`
      : initialPassword;
    const user = await this.auth.provisionUser({
      ...(userId ? { id: userId } : {}),
      ...account,
      role: FAMILY_ROLE,
      password: provisioningPassword,
    });
    const password = this.encryption
      ? await this.encryption.hashPassword(initialPassword)
      : undefined;
    await this.userRecords?.update(user.id, {
      ...(password ? { password } : {}),
      phone,
      phoneVerified: false,
      emailVerified: true,
    });
    await this.access?.requireFamilyPasswordChange(user.id);
    const family = await this.families.create({
      id,
      userId: user.id,
      guardianLegalName: account.name,
      guardianCin,
      guardianDateOfBirth,
      exactAddress,
      phone: phone ?? null,
      housingSituation,
      registrationDate,
      supportPriority,
      createdByUserId: actorUserId,
      fundingTargetMinor,
      relationshipToChildren: relationshipToChildren ?? null,
      notes: notes ?? null,
    });
    await this.budgets.ensureForFamily(family!.id);

    for (const child of initialChildren) {
      await this.children.create({
        ...child,
        familyProfileId: family!.id,
        schoolLevel: child.schoolLevel ?? null,
        clothingSize: child.clothingSize ?? null,
        shoeSize: child.shoeSize ?? null,
        notes: child.notes ?? null,
        image: child.image ?? null,
        status: "active",
      });
    }

    await this.audits.record({
      action: "family.created",
      actorUserId,
      metadata: {
        childCount: initialChildren.length,
        fundingTargetMinor,
        supportPriority,
      },
      resource: "families",
      resourceId: family!.id,
    });
    return { ...family!, initialPassword };
  }

  @Transaction({ retries: 2 })
  async update(id: string, data: UpdateFamilyDto, actorUserId: string) {
    const current = await this.validator.ensureExists(id);
    const input = updateFamilyDto.parse(data);
    const { name, email, image, ...profile } = input;
    const changedFields = familyChangedFields(current, input);

    await this.validator.ensureEmailUnique(email, current.userId);
    await this.validator.ensurePhoneUnique(input.phone, id, current.userId);
    await this.validator.ensureGuardianCinUnique(input.guardianCin, id);

    if (
      input.fundingTargetMinor !== undefined &&
      input.fundingTargetMinor !== current.fundingTargetMinor
    ) {
      // Lock the family's budget account row before reading committed
      // funding so concurrent submissions serialize against this update.
      await this.accounts.createForFamily(id);
      await this.accounts.lockByFamilyId(id);
      await this.funding.ensureTargetCanLower(
        id,
        input.fundingTargetMinor,
      );
    }

    if (name !== undefined || email !== undefined || image !== undefined) {
      await this.users.update(current.userId, { name, email, image });
    }
    if (input.phone !== undefined) {
      await this.userRecords?.update(current.userId, {
        phone: input.phone,
        phoneVerified: false,
      });
    }

    const updated = await this.families.update(id, {
      ...profile,
      ...(name === undefined ? {} : { guardianLegalName: name }),
    });

    const profileChangedFields = changedFields.filter(
      (field) => field !== "fundingTargetMinor",
    );
    if (profileChangedFields.length > 0) {
      await this.audits.record({
        action: "family.updated",
        actorUserId,
        metadata: { changedFields: profileChangedFields.join(",") },
        resource: "families",
        resourceId: current.id,
      });
    }

    if (
      input.fundingTargetMinor !== undefined &&
      input.fundingTargetMinor !== current.fundingTargetMinor
    ) {
      await this.audits.record({
        action: "family.fundingTargetUpdated",
        actorUserId,
        metadata: {
          previousTargetMinor: current.fundingTargetMinor,
          targetMinor: input.fundingTargetMinor,
        },
        resource: "families",
        resourceId: current.id,
      });
      await this.funding.activateIfEligible(id, actorUserId);
    }

    return updated;
  }

  @Transaction({ retries: 2 })
  async delete(id: string, actorUserId: string) {
    return this.deleteOne(id, actorUserId);
  }

  @Transaction({ retries: 2 })
  async deleteMany(ids: string[], actorUserId: string) {
    const deleted = [];
    for (const id of [...ids].sort()) {
      deleted.push(await this.deleteOne(id, actorUserId));
    }
    return deleted;
  }

  private async deleteOne(id: string, actorUserId: string) {
    const family = await this.validator.ensureExists(id);
    await this.families.deleteWithLinkedRecords(id);
    await this.users.delete(family.userId);
    await this.audits.record({
      action: "family.deleted",
      actorUserId,
      metadata: { permanent: true },
      resource: "families",
      resourceId: family.id,
    });
    return family;
  }

  @Transaction({ retries: 2 })
  async deactivate(
    id: string,
    data: AccountStatusDto,
    actorUserId: string,
  ) {
    return this.changeStatus(id, "inactive", data, actorUserId);
  }

  @Transaction({ retries: 2 })
  async reactivate(
    id: string,
    data: AccountStatusDto,
    actorUserId: string,
  ) {
    return this.changeStatus(id, "active", data, actorUserId);
  }

  private async changeStatus(
    id: string,
    status: "active" | "inactive",
    data: AccountStatusDto,
    actorUserId: string,
  ) {
    const family = await this.validator.ensureExists(id);
    const { reason } = accountStatusDto.parse(data);
    await this.users.update(family.userId, { status });
    await this.tokens?.invalidateUserAccessTokens(family.userId);
    if (status === "inactive") {
      await this.tokens?.revokeAllForUser(family.userId);
    }
    await this.audits.record({
      action: `family.${status === "active" ? "reactivated" : "deactivated"}`,
      actorUserId,
      metadata: { reason },
      resource: "families",
      resourceId: family.id,
    });
    return this.validator.ensureExists(id);
  }
}

function familyChangedFields(current: unknown, input: unknown) {
  const currentValues = current as Record<string, unknown>;
  const inputValues = input as Record<string, unknown>;
  const fields = [
    "name",
    "email",
    "image",
    "guardianCin",
    "guardianDateOfBirth",
    "exactAddress",
    "phone",
    "relationshipToChildren",
    "notes",
    "housingSituation",
    "registrationDate",
    "supportPriority",
    "fundingTargetMinor",
  ];

  return fields.filter(
    (field) =>
      inputValues[field] !== undefined &&
      inputValues[field] !== currentValues[field],
  );
}
