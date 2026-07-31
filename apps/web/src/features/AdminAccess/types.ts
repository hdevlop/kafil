import type { OffsetPagination } from "@/lib/pagination";

export type AccessRoleName = "admin" | "operator" | "family" | "sponsor";
export type AccessUserStatus = "active" | "inactive" | "pending";

export interface AccessUser {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  status: AccessUserStatus;
  roleId: string | null;
  role: AccessRoleName | null;
  lastLogin: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  familyProfileId: string | null;
  staffProfileId: string | null;
  sponsorProfileId: string | null;
}

export interface AccessPermission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
}

export interface AccessUserDetail extends AccessUser {
  effectivePermissions: AccessPermission[];
}

export interface AccessUserPage {
  items: AccessUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface AccessUserListQuery extends OffsetPagination {
  search?: string;
  role?: AccessRoleName;
  status?: AccessUserStatus;
  verified?: boolean;
}

export interface AccessRole {
  id: string;
  name: AccessRoleName;
  description: string | null;
  userCount: number;
  permissionCount: number;
  permissions?: AccessPermission[];
  codeManaged: true;
  inSync: boolean;
}

export interface AccessPermissionView extends AccessPermission {
  roles: Array<{ id: string; name: string }>;
  expectedRoles: AccessRoleName[];
  drift:
    | "in_sync"
    | "missing_live_grant"
    | "unexpected_live_grant"
    | "custom";
  missingRoles: AccessRoleName[];
  unexpectedRoles: string[];
  codeManaged: boolean;
}

export interface AccessReasonCommand {
  userId: string;
  reason: string;
}

export interface CreateAccessPermissionInput {
  action: string;
  resource: string;
  description?: string;
  roles: AccessRoleName[];
}
