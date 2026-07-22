import { UserRepository, UserValidator } from "najm-auth";
import { HttpError, Service } from "najm-core";

import { SponsorRepository } from "./sponsorRepository";

const SPONSOR_ROLE = "sponsor";

@Service()
export class SponsorValidator {
  constructor(
    private readonly sponsors: SponsorRepository,
    private readonly users: UserValidator,
    private readonly userRecords?: UserRepository,
  ) {}

  async ensureExists(id: string) {
    const sponsor = await this.sponsors.findById(id);
    if (!sponsor || sponsor.role !== SPONSOR_ROLE) {
      HttpError.notFound("Sponsor not found");
    }
    return sponsor;
  }

  async ensureIdUnique(id?: string) {
    if (!id) return;
    if (await this.sponsors.findById(id)) {
      HttpError.conflict("Sponsor ID already exists");
    }
  }

  async ensureUserIdUnique(userId?: string) {
    if (!userId) return;
    await this.users.checkUserIdIsUnique(userId);
  }

  async ensureProfileMissing(userId: string) {
    if (await this.sponsors.findByUserId(userId)) {
      HttpError.conflict("Sponsor profile already exists");
    }
  }

  async ensureEmailUnique(email?: string, excludeUserId?: string) {
    if (!email) return;
    await this.users.checkEmailUnique(email, excludeUserId);
  }

  async ensurePhoneUnique(
    phone?: string | null,
    excludeId?: string,
    excludeUserId?: string,
  ) {
    if (!phone) return;
    const user = await this.userRecords?.findByPhone(phone);
    if (user && user.id !== excludeUserId) {
      HttpError.conflict("Phone number already belongs to another account");
    }
    const existing = await this.sponsors.findByPhone(phone);
    if (existing && existing.id !== excludeId) {
      HttpError.conflict("Sponsor phone already exists");
    }
  }

  async ensureCinUnique(cin?: string | null, excludeId?: string) {
    if (!cin) return;
    const existing = await this.sponsors.findByCin(cin);
    if (existing && existing.id !== excludeId) {
      HttpError.conflict("Sponsor CIN already exists");
    }
  }
}
