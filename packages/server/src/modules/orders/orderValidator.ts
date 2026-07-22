import { HttpError, Service } from "najm-core";

import { FamilyRepository } from "../families/familyRepository";
import { OrderRepository } from "./orderRepository";
import type { Order, OrderStatus } from "./orderSchema";

@Service()
export class OrderValidator {
  constructor(
    private readonly orders: OrderRepository,
    private readonly families: FamilyRepository,
  ) {}

  async ensureFamily(userId: string) {
    const family = await this.families.findByUserId(userId);
    if (!family || family.role !== "family") {
      HttpError.notFound("Family order access not found");
    }
    return family;
  }

  async ensureOrderExists(id: string) {
    const order = await this.orders.findById(id);
    if (!order) {
      HttpError.notFound("Order not found");
    }
    return order;
  }

  async ensureOrderOwnedByFamily(id: string, userId: string) {
    const family = await this.ensureFamily(userId);
    const order = await this.orders.findOwnedById(id, family.id);
    if (!order) {
      HttpError.notFound("Order not found");
    }
    return { family, order };
  }

  ensureLockedOrderOwnedBy(order: Order, familyProfileId: string) {
    if (order.familyProfileId !== familyProfileId) {
      HttpError.notFound("Order not found");
    }
  }

  ensureStatus(order: Order, expected: OrderStatus) {
    if (order.status !== expected) {
      HttpError.conflict(`Order must be ${expected}`);
    }
  }

  ensureOneOfStatuses(order: Order, expected: OrderStatus[]) {
    if (!expected.includes(order.status)) {
      HttpError.conflict("Order cannot be cancelled in its current status");
    }
  }

  ensureSameFamily(expected: string, actual: string) {
    if (expected !== actual) {
      HttpError.conflict("Idempotency key was already used for another household");
    }
  }
}
