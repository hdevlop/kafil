import { UserRepository, UserValidator } from "najm-auth";
import { HttpError, Service } from "najm-core";

import { type StaffFunctionKey, isStaffFunctionKey } from "./staffFunctions";
import { StaffRepository } from "./staffRepository";

@Service()
export class StaffValidator {
  constructor(
    private readonly staff: StaffRepository,
    private readonly users: UserValidator,
    private readonly userRecords?: UserRepository,
  ) {}

  async ensureExists(id: string) {
    const profile = await this.staff.findById(id);
    if (!profile) {
      HttpError.notFound("Staff profile not found");
    }
    return profile;
  }

  async ensureIdUnique(id?: string) {
    if (!id) return;
    const profile = await this.staff.findById(id);
    if (profile) {
      HttpError.conflict("Staff ID already exists");
    }
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
    const existing = await this.staff.findByPhone(phone);
    if (existing && existing.id !== excludeId) {
      HttpError.conflict("Staff phone already exists");
    }
  }

  async ensureCinUnique(cin?: string | null, excludeId?: string) {
    if (!cin) return;
    const existing = await this.staff.findByCin(cin);
    if (existing && existing.id !== excludeId) {
      HttpError.conflict("Staff CIN already exists");
    }
  }

  async ensureUserIdUnique(userId?: string) {
    if (!userId) return;
    await this.users.checkUserIdIsUnique(userId);
  }

  async ensureEmailUnique(email?: string | null, excludeUserId?: string) {
    if (!email) return;
    await this.users.checkEmailUnique(email, excludeUserId);
  }

  async ensureFunctionKeys(keys: readonly string[]) {
    if (!keys || keys.length === 0) {
      HttpError.badRequest("At least one staff function is required");
    }
    for (const key of keys) {
      if (!isStaffFunctionKey(key)) {
        HttpError.badRequest(`Unknown staff function '${key}'`);
      }
    }
  }

  async ensureCanRemoveOperatorFunction(
    staffProfileId: string,
    nextFunctionKeys: readonly StaffFunctionKey[],
  ) {
    if (nextFunctionKeys.includes("operator")) return;
    const hadOperator =
      (await this.staff.findById(staffProfileId))?.functions.includes(
        "operator",
      ) ?? false;
    if (!hadOperator) return;
    const hasUser = await this.staff.hasOperatorFunction(staffProfileId);
    if (!hasUser) return;
    HttpError.conflict(
      "Deactivate or remove operator access before removing the operator function",
    );
  }
}