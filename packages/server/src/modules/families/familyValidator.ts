import { UserRepository, UserValidator } from "najm-auth";
import { HttpError, Service } from "najm-core";

import { FamilyRepository } from "./familyRepository";

const FAMILY_ROLE = "family";

@Service()
export class FamilyValidator {
  constructor(
    private readonly families: FamilyRepository,
    private readonly users: UserValidator,
    private readonly userRecords?: UserRepository,
  ) {}

  async ensureExists(id: string) {
    const family = await this.families.findById(id);
    if (!family || family.role !== FAMILY_ROLE) {
      HttpError.notFound("Family not found");
    }
    return family;
  }

  async ensureUserIdUnique(userId?: string) {
    if (userId) {
      await this.users.checkUserIdIsUnique(userId);
    }
  }

  async ensureIdUnique(id?: string) {
    if (id && (await this.families.findById(id))) {
      HttpError.conflict("Family ID already exists");
    }
  }

  async ensureEmailUnique(email?: string, excludeUserId?: string) {
    if (email) {
      await this.users.checkEmailUnique(email, excludeUserId);
    }
  }

  async ensurePhoneUnique(
    phone?: string | null,
    excludeFamilyId?: string,
    excludeUserId?: string,
  ) {
    if (!phone) return;
    const user = await this.userRecords?.findByPhone(phone);
    if (user && user.id !== excludeUserId) {
      HttpError.conflict("Phone number already belongs to another account");
    }
    const family = await this.families.findByPhone(phone);
    if (family && family.id !== excludeFamilyId) {
      HttpError.conflict("Family phone already exists");
    }
  }

  async ensureGuardianCinUnique(
    guardianCin?: string | null,
    excludeFamilyId?: string,
  ) {
    if (!guardianCin) return;
    const family = await this.families.findByGuardianCin(guardianCin);
    if (family && family.id !== excludeFamilyId) {
      HttpError.conflict("Primary guardian CIN already exists");
    }
  }
}
