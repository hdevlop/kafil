export interface SupportAssignmentRecord {
  id: string;
  sponsorProfileId: string;
  familyProfileId: string;
  childId: string | null;
  status: "active" | "ended" | string;
  startedAt: string;
  endedAt: string | null;
  assignedByUserId: string;
  endedByUserId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSponsorOption {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phone: string | null;
  gender: "F" | "M" | null;
  status: string;
}

export interface AssignmentContributionPlanOption {
  id: string;
  supportAssignmentId: string;
  amountMinor: number;
  kind: "monthly" | "one_time" | string;
  status: "active" | "paused" | "stopped" | "completed" | string;
}

export interface AssignmentFamilyOption {
  id: string;
  name: string;
  guardianLegalName: string;
  exactAddress: string;
  phone: string | null;
}

export interface SupportAssignmentSources {
  sponsors: AssignmentSponsorOption[];
  families: AssignmentFamilyOption[];
  plans: AssignmentContributionPlanOption[];
}

export interface SupportAssignmentView extends SupportAssignmentRecord {
  sponsorLabel: string;
  familyLabel: string;
  sponsorImage: string | null;
  sponsorGender: "F" | "M" | null;
  sponsorEmail: string | null;
  sponsorPhone: string | null;
  sponsorshipPriceMinor: number | null;
}

export interface CreateSupportAssignmentInput {
  sponsorProfileId: string;
  familyProfileId: string;
  notes?: string | null;
}

export interface EndSupportAssignmentInput {
  id: string;
  reason: string;
}

export interface UpdateSupportAssignmentNotesInput {
  id: string;
  notes: string | null;
}
