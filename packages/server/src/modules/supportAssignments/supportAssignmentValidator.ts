import { HttpError, Service } from "najm-core";

import { FamilyValidator } from "../families/familyValidator";
import { SponsorValidator } from "../sponsors/sponsorValidator";
import { SupportAssignmentRepository } from "./supportAssignmentRepository";

@Service()
export class SupportAssignmentValidator {
  constructor(
    private readonly assignments: SupportAssignmentRepository,
    private readonly sponsors: SponsorValidator,
    private readonly families: FamilyValidator,
  ) {}

  async ensureExists(id: string) {
    const assignment = await this.assignments.findById(id);
    if (!assignment) {
      HttpError.notFound("Support assignment not found");
    }
    return assignment;
  }

  async ensureOwnedBy(id: string, userId: string) {
    const assignment = await this.assignments.findOwnById(id, userId);
    if (!assignment) {
      HttpError.notFound("Support assignment not found");
    }
    return assignment;
  }

  async ensureSponsorAssignable(sponsorProfileId: string) {
    const sponsor = await this.sponsors.ensureExists(sponsorProfileId);
    if (sponsor.status !== "active") {
      HttpError.conflict("Sponsor account is inactive");
    }
    return sponsor;
  }

  ensureFamilyExists(familyProfileId: string) {
    return this.families.ensureExists(familyProfileId);
  }

  async ensureNoActiveDuplicate(
    sponsorProfileId: string,
    familyProfileId: string,
    childId: string | null,
    excludeId?: string,
  ) {
    if (
      await this.assignments.findActiveByTarget(
        sponsorProfileId,
        familyProfileId,
        childId,
        excludeId,
      )
    ) {
      HttpError.conflict("An active support assignment already exists for this target");
    }
  }

  ensureActive(status: "active" | "ended") {
    if (status !== "active") {
      HttpError.conflict("Support assignment is already ended");
    }
  }
}
