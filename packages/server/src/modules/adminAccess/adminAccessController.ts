import {
  Body,
  Controller,
  Get,
  Params,
  Post,
  Query,
  ResMsg,
  User,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isAdmin } from "../../config/authConfig";
import {
  type AccessReasonDto,
  accessReasonDto,
  type CreateAccessPermissionDto,
  createAccessPermissionDto,
  accessRoleIdParams,
  accessUserIdParams,
  type AccessUserListQuery,
  accessUserListQuery,
} from "./adminAccessDto";
import { AdminAccessService } from "./adminAccessService";

@ToolGroup("admin-access")
@Controller("/admin/access")
export class AdminAccessController {
  constructor(private readonly access: AdminAccessService) {}

  @Get("/users")
  @isAdmin()
  @Validate({ query: accessUserListQuery })
  @McpTool({ description: "List privacy-safe Kafil access users", readOnly: true })
  @ResMsg("adminAccess.success.retrieved")
  listUsers(@Query() query: AccessUserListQuery) {
    return this.access.listUsers(query);
  }

  @Get("/users/:userId")
  @isAdmin()
  @Validate({ params: accessUserIdParams })
  @McpTool({ description: "Read a privacy-safe Kafil access user", readOnly: true })
  @ResMsg("adminAccess.success.retrieved")
  getUser(@Params("userId") userId: string) {
    return this.access.getUser(userId);
  }

  @Post("/users/:userId/deactivate")
  @isAdmin()
  @Validate({ params: accessUserIdParams, body: accessReasonDto })
  @McpTool({
    description: "Deactivate a Kafil user and revoke every session",
    destructive: true,
    confirm: { level: "danger", message: "Deactivate this user and revoke all sessions?" },
  })
  @ResMsg("adminAccess.success.deactivated")
  deactivate(
    @Params("userId") userId: string,
    @Body() body: AccessReasonDto,
    @User("id") actorUserId: string,
  ) {
    return this.access.deactivate(userId, body, actorUserId);
  }

  @Post("/users/:userId/reactivate")
  @isAdmin()
  @Validate({ params: accessUserIdParams, body: accessReasonDto })
  @McpTool({
    description: "Reactivate an eligible Kafil user",
    confirm: { level: "warning", message: "Reactivate this user?" },
  })
  @ResMsg("adminAccess.success.reactivated")
  reactivate(
    @Params("userId") userId: string,
    @Body() body: AccessReasonDto,
    @User("id") actorUserId: string,
  ) {
    return this.access.reactivate(userId, body, actorUserId);
  }

  @Post("/users/:userId/revoke-sessions")
  @isAdmin()
  @Validate({ params: accessUserIdParams })
  @McpTool({
    description: "Revoke every active session for a Kafil user",
    destructive: true,
    confirm: { level: "danger", message: "Sign this user out from every device?" },
  })
  @ResMsg("adminAccess.success.sessionsRevoked")
  revokeSessions(
    @Params("userId") userId: string,
    @User("id") actorUserId: string,
  ) {
    return this.access.revokeSessions(userId, actorUserId);
  }

  @Get("/roles")
  @isAdmin()
  @McpTool({ description: "List fixed Kafil roles and effective grants", readOnly: true })
  @ResMsg("adminAccess.success.retrieved")
  listRoles() {
    return this.access.listRoles();
  }

  @Get("/roles/:roleId")
  @isAdmin()
  @Validate({ params: accessRoleIdParams })
  @McpTool({ description: "Read a fixed Kafil role and effective grants", readOnly: true })
  @ResMsg("adminAccess.success.retrieved")
  getRole(@Params("roleId") roleId: string) {
    return this.access.getRole(roleId);
  }

  @Get("/permissions")
  @isAdmin()
  @McpTool({ description: "List code-managed Kafil permissions and grant drift", readOnly: true })
  @ResMsg("adminAccess.success.retrieved")
  listPermissions() {
    return this.access.listPermissions();
  }

  @Post("/permissions")
  @isAdmin()
  @Validate({ body: createAccessPermissionDto })
  @McpTool({
    description: "Create a custom Kafil permission and grant it to fixed roles",
    confirm: {
      level: "warning",
      message: "Create this custom permission and update role grants?",
    },
  })
  @ResMsg("adminAccess.success.permissionCreated")
  createPermission(
    @Body() body: CreateAccessPermissionDto,
    @User("id") actorUserId: string,
  ) {
    return this.access.createPermission(body, actorUserId);
  }
}
