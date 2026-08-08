import {
  AuthService,
  TokenService,
  UserRepository,
  UserService,
} from "najm-auth";
import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { listPage } from "../../pagination";
import { AuditService } from "../audit/auditService";
import { DashboardService } from "../dashboard/dashboardService";
import { generateInitialPassword } from "../../initialPassword";
import { removeManagedImage } from "../../storage/managedImageController";
import {
  type CreateOwnSponsorProfileDto,
  createOwnSponsorProfileDto,
  type CreateSponsorDto,
  createSponsorDto,
  type SponsorStatusDto,
  sponsorStatusDto,
  type SponsorListQuery,
  sponsorListQuery,
  type UpdateOwnSponsorProfileDto,
  updateOwnSponsorProfileDto,
  type UpdateSponsorDto,
  updateSponsorDto,
} from "./sponsorDto";
import { SponsorRepository } from "./sponsorRepository";
import { SponsorValidator } from "./sponsorValidator";
import { SPONSOR_IMAGE_SERVE_PREFIX } from "./sponsorImageController";

const SPONSOR_ROLE = "sponsor";

@Service()
export class SponsorService {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
    private readonly sponsors: SponsorRepository,
    private readonly audits: AuditService,
    private readonly validator: SponsorValidator,
    private readonly dashboard: DashboardService,
    private readonly userRecords?: UserRepository,
    private readonly tokens?: TokenService,
  ) {}

  async list(query: SponsorListQuery) {
    const { limit, offset, ...filters } = sponsorListQuery.parse(query ?? {});
    const [rows, total] = await Promise.all([
      this.sponsors.list(limit, offset, filters),
      this.sponsors.count(filters),
    ]);
    return listPage(rows, { limit, offset, total });
  }

  async get(id: string) {
    return this.validator.ensureExists(id);
  }

  async getOverview(sponsorProfileId: string) {
    const sponsor = await this.validator.ensureExists(sponsorProfileId);
    const metrics = await this.dashboard.getSponsorMetrics(sponsorProfileId);

    return {
      sponsor: {
        id: sponsor.id,
        name: sponsor.name,
        email: sponsor.email,
        image: sponsor.image,
        status: sponsor.status,
        phone: sponsor.phone,
        cin: sponsor.cin,
        gender: sponsor.gender,
        address: sponsor.address,
        dateOfBirth: sponsor.dateOfBirth,
        notes: sponsor.notes,
        createdAt: sponsor.createdAt,
      },
      metrics,
    };
  }

  async getOwn(userId: string) {
    const sponsor = await this.sponsors.findByUserId(userId);
    if (!sponsor || sponsor.role !== SPONSOR_ROLE) {
      HttpError.notFound("Sponsor profile not found");
    }
    return {
      id: sponsor.id,
      userId: sponsor.userId,
      name: sponsor.name,
      email: sponsor.email,
      image: sponsor.image,
      emailVerified: sponsor.emailVerified,
      status: sponsor.status,
      role: sponsor.role,
      phone: sponsor.phone,
      cin: sponsor.cin,
      gender: sponsor.gender,
      address: sponsor.address,
      dateOfBirth: sponsor.dateOfBirth,
      createdAt: sponsor.createdAt,
      updatedAt: sponsor.updatedAt,
    };
  }

  @Transaction({ retries: 2 })
  async create(data: CreateSponsorDto) {
    const {
      id,
      userId,
      phone,
      cin,
      gender,
      address,
      dateOfBirth,
      notes,
      ...account
    } = createSponsorDto.parse(data);
    await this.validator.ensureIdUnique(id);
    await this.validator.ensureUserIdUnique(userId);
    await this.validator.ensureEmailUnique(account.email);
    await this.validator.ensurePhoneUnique(phone);
    await this.validator.ensureCinUnique(cin);

    const initialPassword = generateInitialPassword(
      account.name || account.email,
      dateOfBirth,
    );
    const user = await this.auth.provisionUser({
      ...(userId ? { id: userId } : {}),
      ...account,
      role: SPONSOR_ROLE,
      password: initialPassword,
    });
    await this.userRecords?.update(user.id, {
      phone,
      phoneVerified: false,
      emailVerified: true,
    });
    const sponsor = await this.sponsors.create({
      id,
      userId: user.id,
      phone,
      cin,
      gender,
      address,
      dateOfBirth,
      notes: notes ?? null,
    });
    return { ...sponsor!, initialPassword };
  }

  @Transaction({ retries: 2 })
  async createOwn(userId: string, data: CreateOwnSponsorProfileDto) {
    const { image, ...input } = createOwnSponsorProfileDto.parse(data);
    await this.validator.ensureProfileMissing(userId);
    await this.validator.ensurePhoneUnique(input.phone, undefined, userId);
    await this.validator.ensureCinUnique(input.cin);
    await this.userRecords?.update(userId, {
      phone: input.phone,
      phoneVerified: false,
      image: image ?? null,
    });
    return this.sponsors.create({
      ...input,
      userId,
      notes: null,
    });
  }

  @Transaction({ retries: 2 })
  async updateOwn(userId: string, data: UpdateOwnSponsorProfileDto) {
    const sponsor = await this.ensureOwn(userId);
    const { image, ...input } = updateOwnSponsorProfileDto.parse(data);
    await this.validator.ensurePhoneUnique(
      input.phone,
      sponsor.id,
      sponsor.userId,
    );
    await this.validator.ensureCinUnique(input.cin, sponsor.id);
    if (input.phone !== undefined || image !== undefined) {
      await this.userRecords?.update(sponsor.userId, {
        ...(input.phone !== undefined
          ? { phone: input.phone, phoneVerified: false }
          : {}),
        ...(image !== undefined ? { image: image ?? null } : {}),
      });
    }
    const profile = await this.sponsors.update(sponsor.id, input);
    return {
      profile,
      replacedImagePath:
        image !== undefined && sponsor.image && sponsor.image !== image
          ? sponsor.image
          : null,
    };
  }

  async cleanupImageAfterCommit(imagePath: string | null) {
    if (!imagePath?.startsWith(SPONSOR_IMAGE_SERVE_PREFIX)) return;
    const fileName = imagePath.slice(SPONSOR_IMAGE_SERVE_PREFIX.length);
    try {
      await removeManagedImage("sponsor-images", fileName);
    } catch (error) {
      console.warn("Sponsor image cleanup failed after profile update", {
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  @Transaction({ retries: 2 })
  async update(id: string, data: UpdateSponsorDto) {
    const sponsor = await this.validator.ensureExists(id);
    const {
      phone,
      cin,
      gender,
      address,
      dateOfBirth,
      notes,
      ...account
    } = updateSponsorDto.parse(data);
    await this.validator.ensureEmailUnique(account.email, sponsor.userId);
    await this.validator.ensurePhoneUnique(phone, id, sponsor.userId);
    await this.validator.ensureCinUnique(cin, id);

    if (Object.keys(account).length > 0) {
      await this.users.update(sponsor.userId, account);
    }
    if (phone !== undefined) {
      await this.userRecords?.update(sponsor.userId, {
        phone,
        phoneVerified: false,
      });
    }

    await this.sponsors.update(id, {
      phone,
      cin,
      gender,
      address,
      dateOfBirth,
      notes,
    });
    return this.validator.ensureExists(id);
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
    const sponsor = await this.validator.ensureExists(id);
    if (await this.sponsors.hasLinkedHistory(id)) {
      HttpError.conflict(
        "A sponsor with support or contribution history cannot be permanently deleted",
      );
    }
    await this.sponsors.delete(id);
    await this.users.delete(sponsor.userId);
    await this.audits.record({
      action: "sponsor.deleted",
      actorUserId,
      metadata: { permanent: true },
      resource: "sponsors",
      resourceId: sponsor.id,
    });
    return sponsor;
  }

  @Transaction({ retries: 2 })
  async deactivate(id: string, data: SponsorStatusDto, actorUserId: string) {
    return this.changeStatus(id, "inactive", data, actorUserId);
  }

  @Transaction({ retries: 2 })
  async reactivate(id: string, data: SponsorStatusDto, actorUserId: string) {
    return this.changeStatus(id, "active", data, actorUserId);
  }

  private async ensureOwn(userId: string) {
    const sponsor = await this.sponsors.findByUserId(userId);
    if (!sponsor || sponsor.role !== SPONSOR_ROLE) {
      HttpError.notFound("Sponsor profile not found");
    }
    return sponsor;
  }

  private async changeStatus(
    id: string,
    status: "active" | "inactive",
    data: SponsorStatusDto,
    actorUserId: string,
  ) {
    const sponsor = await this.validator.ensureExists(id);
    const { reason } = sponsorStatusDto.parse(data);
    await this.users.update(sponsor.userId, { status });
    await this.tokens?.invalidateUserAccessTokens(sponsor.userId);
    if (status === "inactive") {
      await this.tokens?.revokeAllForUser(sponsor.userId);
    }
    await this.audits.record({
      action: `sponsor.${status === "active" ? "reactivated" : "deactivated"}`,
      actorUserId,
      metadata: { reason },
      resource: "sponsors",
      resourceId: sponsor.id,
    });
    return this.validator.ensureExists(id);
  }
}
