import { UserRepository, UserValidator } from "najm-auth";
import { HttpError, Service } from "najm-core";

import { OperatorRepository } from "./operatorRepository";

const OPERATOR_ROLE = "operator";

@Service()
export class OperatorValidator {
  constructor(
    private readonly operators: OperatorRepository,
    private readonly users: UserValidator,
    private readonly userRecords?: UserRepository,
  ) {}

  async ensureExists(id: string) {
    const operator = await this.operators.findById(id);
    if (!operator || operator.role !== OPERATOR_ROLE) {
      HttpError.notFound("Operator not found");
    }
    return operator;
  }

  async ensureIdUnique(id?: string) {
    if (!id) return;
    if (await this.operators.findById(id)) {
      HttpError.conflict("Operator ID already exists");
    }
  }

  async ensureUserIdUnique(userId?: string) {
    if (!userId) return;
    await this.users.checkUserIdIsUnique(userId);
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
    const existing = await this.operators.findByPhone(phone);
    if (existing && existing.id !== excludeId) {
      HttpError.conflict("Operator phone already exists");
    }
  }

  async ensureCinUnique(cin?: string | null, excludeId?: string) {
    if (!cin) return;
    const existing = await this.operators.findByCin(cin);
    if (existing && existing.id !== excludeId) {
      HttpError.conflict("Operator CIN already exists");
    }
  }
}
