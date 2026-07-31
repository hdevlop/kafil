export type StaffFunctionKey = "operator" | "delivery";

export type StaffStatus = "active" | "inactive";
export type StaffAffiliation = "internal" | "external";

export interface StaffRecord {
  id: string;
  userId: string | null;
  name: string;
  contactEmail: string | null;
  email: string | null;
  emailVerified: boolean | null;
  phone: string;
  image: string | null;
  affiliation: StaffAffiliation;
  companyName: string | null;
  cin: string | null;
  gender: "F" | "M" | null;
  address: string | null;
  dateOfBirth: string | null;
  jobTitle: string | null;
  status: StaffStatus;
  notes: string | null;
  functions: StaffFunctionKey[];
  hasOperatorAccess: boolean;
  role: string | null;
  userStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAssignmentOption {
  id: string;
  name: string;
  image: string | null;
  phone: string;
  affiliation: StaffAffiliation;
  companyName: string | null;
  functionKeys: StaffFunctionKey[];
}

export type StaffDeliveryOption = StaffAssignmentOption;

export interface StaffPage {
  items: StaffRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface StaffListQuery {
  limit?: number;
  offset?: number;
  search?: string;
  status?: StaffStatus;
  affiliation?: StaffAffiliation;
  functionKey?: StaffFunctionKey;
  hasAccess?: boolean;
  sortBy?: "name" | "affiliation" | "phone" | "status" | "createdAt";
  sortDirection?: "asc" | "desc";
}

export interface StaffProfileInput {
  name: string;
  phone: string;
  contactEmail?: string | null;
  image?: string | null;
  affiliation: StaffAffiliation;
  companyName?: string | null;
  cin?: string | null;
  gender?: "F" | "M" | null;
  address?: string | null;
  dateOfBirth?: string | null;
  jobTitle?: string | null;
  notes?: string | null;
  functions: StaffFunctionKey[];
  createOperatorAccess?: boolean;
  createOperatorAccessEmail?: string | null;
}

export type CreateStaffInput = StaffProfileInput;

export type UpdateStaffInput = Partial<StaffProfileInput>;

export interface StaffStatusInput {
  id: string;
  reason: string;
}

export interface StaffBulkDeleteInput {
  ids: string[];
}

export interface StaffProvisionAccessInput {
  id: string;
  email: string;
}

export interface StaffProvisionAccessResult {
  profile: StaffRecord;
  initialPassword: string;
}

export interface StaffCreateResult extends StaffRecord {
  initialPassword: string | null;
}
