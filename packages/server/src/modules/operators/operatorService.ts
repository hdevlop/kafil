import {
  AuthService,
  UserRepository,
  UserService,
} from "najm-auth";
import { Service } from "najm-core";
import { Transaction } from "najm-database";

import {
  type CreateOperatorDto,
  createOperatorDto,
  type OperatorListQuery,
  operatorListQuery,
  type UpdateOperatorDto,
  updateOperatorDto,
} from "./operatorDto";
import { OperatorRepository } from "./operatorRepository";
import { OperatorValidator } from "./operatorValidator";

const OPERATOR_ROLE = "operator";

@Service()
export class OperatorService {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
    private readonly operators: OperatorRepository,
    private readonly validator: OperatorValidator,
    private readonly userRecords?: UserRepository,
  ) {}

  async list(query: OperatorListQuery) {
    const { limit, offset } = operatorListQuery.parse(query ?? {});
    return this.operators.list(limit, offset);
  }

  async get(id: string) {
    return this.validator.ensureExists(id);
  }

  @Transaction({ retries: 2 })
  async create(data: CreateOperatorDto) {
    const {
      id,
      userId,
      phone,
      cin,
      gender,
      address,
      dateOfBirth,
      jobTitle,
      notes,
      ...account
    } = createOperatorDto.parse(data);
    await this.validator.ensureIdUnique(id);
    await this.validator.ensureUserIdUnique(userId);
    await this.validator.ensureEmailUnique(account.email);
    await this.validator.ensurePhoneUnique(phone);
    await this.validator.ensureCinUnique(cin);

    const user = await this.auth.provisionUser({
      id: userId,
      ...account,
      role: OPERATOR_ROLE,
    });
    await this.userRecords?.update(user.id, {
      phone,
      phoneVerified: false,
    });
    return this.operators.create({
      id,
      userId: user.id,
      phone,
      cin,
      gender,
      address,
      dateOfBirth,
      jobTitle: jobTitle ?? null,
      notes: notes ?? null,
    });
  }

  @Transaction({ retries: 2 })
  async update(id: string, data: UpdateOperatorDto) {
    const operator = await this.validator.ensureExists(id);
    const {
      phone,
      cin,
      gender,
      address,
      dateOfBirth,
      jobTitle,
      notes,
      ...account
    } = updateOperatorDto.parse(data);
    await this.validator.ensureEmailUnique(account.email, operator.userId);
    await this.validator.ensurePhoneUnique(phone, id, operator.userId);
    await this.validator.ensureCinUnique(cin, id);

    if (Object.keys(account).length > 0) {
      await this.users.update(operator.userId, account);
    }
    if (phone !== undefined) {
      await this.userRecords?.update(operator.userId, {
        phone,
        phoneVerified: false,
      });
    }

    await this.operators.update(id, {
      phone,
      cin,
      gender,
      address,
      dateOfBirth,
      jobTitle,
      notes,
    });
    return this.validator.ensureExists(id);
  }

  @Transaction({ retries: 2 })
  async delete(id: string) {
    const operator = await this.validator.ensureExists(id);
    await this.operators.delete(id);
    await this.users.delete(operator.userId);
    return operator;
  }
}
