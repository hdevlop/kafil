import { HttpError, Service } from "najm-core";

import { SupportAssignmentRepository } from "../supportAssignments/supportAssignmentRepository";
import { SupportAssignmentValidator } from "../supportAssignments/supportAssignmentValidator";
import {
  ContributionPlanRepository,
  ContributionRepository,
} from "./contributionRepository";

@Service()
export class ContributionValidator {
  constructor(
    private readonly contributions: ContributionRepository,
    private readonly plans: ContributionPlanRepository,
    private readonly assignments: SupportAssignmentRepository,
    private readonly assignmentValidator: SupportAssignmentValidator,
  ) {}

  async ensureContributionExists(id: string) {
    const contribution = await this.contributions.findById(id);
    if (!contribution) {
      HttpError.notFound("Contribution not found");
    }
    return contribution;
  }

  async ensureContributionOwnedBy(id: string, userId: string) {
    const contribution = await this.contributions.findOwnById(id, userId);
    if (!contribution) {
      HttpError.notFound("Contribution not found");
    }
    return contribution;
  }

  async ensurePlanOwnedBy(id: string, userId: string) {
    const plan = await this.plans.findOwnById(id, userId);
    if (!plan) {
      HttpError.notFound("Contribution plan not found");
    }
    return plan;
  }

  async ensureActiveOwnedAssignment(id: string, userId: string) {
    const assignment = await this.assignmentValidator.ensureOwnedBy(id, userId);
    this.assignmentValidator.ensureActive(assignment.status);
    return assignment;
  }

  async ensureActiveAssignment(id: string) {
    const assignment = await this.assignments.findById(id);
    if (!assignment) {
      HttpError.notFound("Support assignment not found");
    }
    this.assignmentValidator.ensureActive(assignment.status);
    return assignment;
  }

  async ensurePlanMatchesAssignment(
    contributionPlanId: string,
    supportAssignmentId: string,
    userId: string,
  ) {
    const plan = await this.ensurePlanOwnedBy(contributionPlanId, userId);
    if (plan.supportAssignmentId !== supportAssignmentId) {
      HttpError.notFound("Active contribution plan not found for assignment");
    }
    if (plan.status !== "active") {
      HttpError.conflict("Contribution plan is not active");
    }
    return plan;
  }

  async ensureOperatorPlanMatchesAssignment(
    contributionPlanId: string,
    supportAssignmentId: string,
  ) {
    const plan = await this.plans.findById(contributionPlanId);
    if (!plan || plan.supportAssignmentId !== supportAssignmentId) {
      HttpError.notFound("Active contribution plan not found for assignment");
    }
    if (plan.status !== "active") {
      HttpError.conflict("Contribution plan is not active");
    }
    return plan;
  }

  async ensureHistoricalAssignment(contribution: {
    supportAssignmentId: string;
    sponsorProfileId: string;
    familyProfileId: string;
  }) {
    const assignment = await this.assignments.findById(
      contribution.supportAssignmentId,
    );
    if (
      !assignment ||
      assignment.sponsorProfileId !== contribution.sponsorProfileId ||
      assignment.familyProfileId !== contribution.familyProfileId
    ) {
      HttpError.conflict("Contribution assignment history is invalid");
    }
    return assignment;
  }

  ensurePending(status: string) {
    if (status !== "pending") {
      HttpError.conflict("Contribution is no longer pending");
    }
  }

  ensureValidated(status: string) {
    if (status !== "validated") {
      HttpError.conflict("Only validated contributions can be refunded");
    }
  }
}
