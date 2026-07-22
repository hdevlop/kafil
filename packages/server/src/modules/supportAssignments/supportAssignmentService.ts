import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { AuditService } from "../audit/auditService";
import { FundingService } from "../settings/fundingService";
import {
  type CreateSupportAssignmentDto,
  createSupportAssignmentDto,
  type EndSupportAssignmentDto,
  endSupportAssignmentDto,
  type UpdateSupportAssignmentNotesDto,
  updateSupportAssignmentNotesDto,
  type OwnSupportAssignmentListQuery,
  ownSupportAssignmentListQuery,
  type SupportAssignmentListQuery,
  supportAssignmentListQuery,
  type SponsorFamilyCatalogQuery,
  sponsorFamilyCatalogQuery,
  type SelectSponsorFamilyDto,
  selectSponsorFamilyDto,
} from "./supportAssignmentDto";
import { SupportAssignmentRepository } from "./supportAssignmentRepository";
import { SupportAssignmentValidator } from "./supportAssignmentValidator";

@Service()
export class SupportAssignmentService {
  constructor(
    private readonly assignments: SupportAssignmentRepository,
    private readonly audits: AuditService,
    private readonly validator: SupportAssignmentValidator,
    private readonly funding?: FundingService,
  ) {}

  async list(query: SupportAssignmentListQuery) {
    const { limit, offset, ...filters } = supportAssignmentListQuery.parse(
      query ?? {},
    );
    return this.assignments.list(limit, offset, filters);
  }

  get(id: string) {
    return this.validator.ensureExists(id);
  }

  async listOwn(userId: string, query: OwnSupportAssignmentListQuery) {
    const { limit, offset, status } = ownSupportAssignmentListQuery.parse(
      query ?? {},
    );
    return this.assignments.listOwn(userId, limit, offset, status);
  }

  async listSponsorFamilyCatalog(query: SponsorFamilyCatalogQuery) {
    const { limit, offset } = sponsorFamilyCatalogQuery.parse(query ?? {});
    const families = await this.assignments.listSponsorFamilyCatalog(limit, offset);
    const funding = await this.funding?.getProgressForFamilies(families);

    return families.map((family) => ({
      id: family.id,
      image: family.image,
      reference: `Family ${family.id.slice(0, 8)}`,
      activeChildCount: family.activeChildCount,
      funding: funding?.get(family.id) ?? null,
    }));
  }

  getOwn(id: string, userId: string) {
    return this.validator.ensureOwnedBy(id, userId);
  }

  async getSupportedFamilySummary(id: string, userId: string) {
    const assignment = await this.validator.ensureOwnedBy(id, userId);
    this.validator.ensureActive(assignment.status);
    const summary = await this.assignments.findFamilySummaryByAssignmentId(id);
    if (!summary) {
      HttpError.notFound("Supported family not found");
    }
    return {
      assignment: {
        id: assignment.id,
        startedAt: assignment.startedAt,
      },
      family: {
        reference: `Family ${summary.familyProfileId.slice(0, 8)}`,
        activeChildCount: summary.childCount,
      },
    };
  }

  async getSupportedChildSummary(id: string, userId: string) {
    const assignment = await this.validator.ensureOwnedBy(id, userId);
    this.validator.ensureActive(assignment.status);
    const summary = await this.assignments.findChildSummaryByAssignmentId(id);
    if (!summary) {
      HttpError.notFound("Supported child not found");
    }
    return {
      assignment: {
        id: assignment.id,
        startedAt: assignment.startedAt,
      },
      child: {
        label: "Supported child",
        ageBand: ageBand(summary.dateOfBirth),
      },
    };
  }

  @Transaction({ retries: 2 })
  async create(data: CreateSupportAssignmentDto, actorUserId: string) {
    const input = createSupportAssignmentDto.parse(data);
    await this.validator.ensureSponsorAssignable(input.sponsorProfileId);
    await this.validator.ensureFamilyExists(input.familyProfileId);
    await this.validator.ensureNoActiveDuplicate(
      input.sponsorProfileId,
      input.familyProfileId,
      null,
    );
    const assignment = await this.assignments.create({
      sponsorProfileId: input.sponsorProfileId,
      familyProfileId: input.familyProfileId,
      childId: null,
      assignedByUserId: actorUserId,
      notes: input.notes ?? null,
    });
    await this.audits.record({
      action: "supportAssignment.created",
      actorUserId,
      metadata: { hasChildTarget: false },
      resource: "supportAssignments",
      resourceId: assignment.id,
    });
    return assignment;
  }

  @Transaction({ retries: 2 })
  async selectFamilyForSponsor(
    data: SelectSponsorFamilyDto,
    actorUserId: string,
  ) {
    const { familyProfileId } = selectSponsorFamilyDto.parse(data);
    const sponsor = await this.assignments.findSponsorByUserId(actorUserId);
    if (!sponsor) {
      HttpError.notFound("Sponsor profile not found");
    }
    await this.validator.ensureSponsorAssignable(sponsor.id);
    const family = await this.validator.ensureFamilyExists(familyProfileId);
    if (family.status !== "active") {
      HttpError.conflict("Family account is inactive");
    }

    const existing = await this.assignments.findActiveByTarget(
      sponsor.id,
      familyProfileId,
      null,
    );
    if (existing) {
      return existing;
    }

    const assignment = await this.assignments.create({
      sponsorProfileId: sponsor.id,
      familyProfileId,
      childId: null,
      assignedByUserId: actorUserId,
      notes: null,
    });
    await this.audits.record({
      action: "supportAssignment.created",
      actorUserId,
      metadata: { hasChildTarget: false, selectedBySponsor: true },
      resource: "supportAssignments",
      resourceId: assignment.id,
    });
    return assignment;
  }

  @Transaction({ retries: 2 })
  async updateNotes(
    id: string,
    data: UpdateSupportAssignmentNotesDto,
    actorUserId: string,
  ) {
    await this.validator.ensureExists(id);
    const { notes } = updateSupportAssignmentNotesDto.parse(data);
    const updated = await this.assignments.updateNotes(id, notes);
    await this.audits.record({
      action: "supportAssignment.notesUpdated",
      actorUserId,
      metadata: { hasNotes: Boolean(notes) },
      resource: "supportAssignments",
      resourceId: id,
    });
    return updated;
  }

  @Transaction({ retries: 2 })
  async end(id: string, data: EndSupportAssignmentDto, actorUserId: string) {
    const assignment = await this.validator.ensureExists(id);
    this.validator.ensureActive(assignment.status);
    const { reason } = endSupportAssignmentDto.parse(data);
    const ended = await this.assignments.end(id, actorUserId);
    await this.audits.record({
      action: "supportAssignment.ended",
      actorUserId,
      metadata: { reason },
      resource: "supportAssignments",
      resourceId: id,
    });
    return ended;
  }
}

function ageBand(dateOfBirth: string) {
  const today = new Date();
  const born = new Date(`${dateOfBirth}T00:00:00.000Z`);
  let age = today.getUTCFullYear() - born.getUTCFullYear();
  const birthdayThisYear = new Date(
    Date.UTC(today.getUTCFullYear(), born.getUTCMonth(), born.getUTCDate()),
  );
  if (today < birthdayThisYear) {
    age -= 1;
  }
  if (age <= 5) return "0-5";
  if (age <= 12) return "6-12";
  if (age <= 17) return "13-17";
  return "18+";
}
