import { HttpError, Service } from "najm-core";

import { FamilyValidator } from "../families/familyValidator";
import { ChildRepository } from "./childRepository";

@Service()
export class ChildValidator {
  constructor(
    private readonly children: ChildRepository,
    private readonly families: FamilyValidator,
  ) {}

  async ensureExists(id: string) {
    const child = await this.children.findById(id);
    if (!child) {
      HttpError.notFound("Child not found");
    }
    return child;
  }

  ensureFamilyExists(familyProfileId: string) {
    return this.families.ensureExists(familyProfileId);
  }
}
