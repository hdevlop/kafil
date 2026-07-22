import { Body, Controller, Delete, Get, Params, Post, Put, Query,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isAdmin } from "../../config/authConfig";
import { type CreateOperatorDto, createOperatorDto, operatorIdParams, type OperatorListQuery,operatorListQuery, type UpdateOperatorDto,updateOperatorDto,} from "./operatorDto";
import { CanCreate, CanDelete, CanList, CanRead, CanUpdate, Operator, Policy} from "./operatorGuards";
import { OperatorService } from "./operatorService";

@ToolGroup("operators")
@Policy(Operator)
@Controller("/operators")
@isAdmin()
export class OperatorController {
  constructor(private readonly operators: OperatorService) {}

  @Get()
  @CanList()
  @Validate({ query: operatorListQuery })
  @McpTool({
    description: "List Kafil operator accounts",
    readOnly: true,
  })
  @ResMsg("operators.success.retrieved")
  list(@Query() query: OperatorListQuery) {
    return this.operators.list(query);
  }

  @Get("/:id")
  @CanRead()
  @Validate({ params: operatorIdParams })
  @McpTool({
    description: "Get a Kafil operator account by profile ID",
    readOnly: true,
  })
  @ResMsg("operators.success.retrieved")
  get(@Params("id") id: string) {
    return this.operators.get(id);
  }

  @Post()
  @CanCreate()
  @Validate({ body: createOperatorDto })
  @McpTool({
    description: "Create a Kafil operator account",
    idempotent: false,
    confirm: {
      level: "warning",
      message: "Create this operator account?",
    },
  })
  @ResMsg("operators.success.created")
  create(@Body() body: CreateOperatorDto) {
    return this.operators.create(body);
  }

  @Put("/:id")
  @CanUpdate()
  @Validate({ params: operatorIdParams, body: updateOperatorDto })
  @McpTool({
    description: "Update a Kafil operator account by profile ID",
    confirm: {
      level: "warning",
      message: "Update this operator account?",
    },
  })
  @ResMsg("operators.success.updated")
  update(@Params("id") id: string, @Body() body: UpdateOperatorDto) {
    return this.operators.update(id, body);
  }

  @Delete("/:id")
  @CanDelete()
  @Validate({ params: operatorIdParams })
  @McpTool({
    description: "Delete a Kafil operator account by profile ID",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Permanently delete this operator account?",
    },
  })
  @ResMsg("operators.success.deleted")
  delete(@Params("id") id: string) {
    return this.operators.delete(id);
  }
}
