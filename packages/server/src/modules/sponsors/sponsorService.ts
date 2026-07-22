import {
  AuthService,
  UserRepository,
  UserService,
} from "najm-auth";
import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { AuditService } from "../audit/auditService";
import { generateInitialPassword } from "../access/initialPassword";
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

const SPONSOR_ROLE = "sponsor";

@Service()
export class SponsorService {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
    private readonly sponsors: SponsorRepository,
    private readonly audits: AuditService,
    private readonly validator: SponsorValidator,
    private readonly userRecords?: UserRepository,
  ) {}

  async list(query: SponsorListQuery) {
    const { limit, offset } = sponsorListQuery.parse(query ?? {});
    return this.sponsors.list(limit, offset);
  }

  async get(id: string) {
    return this.validator.ensureExists(id);
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
    const input = createOwnSponsorProfileDto.parse(data);
    await this.validator.ensureProfileMissing(userId);
    await this.validator.ensurePhoneUnique(input.phone, undefined, userId);
    await this.validator.ensureCinUnique(input.cin);
    await this.userRecords?.update(userId, {
      phone: input.phone,
      phoneVerified: false,
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
    const input = updateOwnSponsorProfileDto.parse(data);
    await this.validator.ensurePhoneUnique(
      input.phone,
      sponsor.id,
      sponsor.userId,
    );
    await this.validator.ensureCinUnique(input.cin, sponsor.id);
    if (input.phone !== undefined) {
      await this.userRecords?.update(sponsor.userId, {
        phone: input.phone,
        phoneVerified: false,
      });
    }
    return this.sponsors.update(sponsor.id, input);
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
