import { Server, type LoggerConfig } from "najm-core";
import { database } from "najm-database";
import {
  authConfig,
  db,
  emailConfig,
  i18nConfig,
  mcpConfig,
} from "./config";
import * as modules from "./modules";

const logger: LoggerConfig = {
  format: process.env.LOG_FORMAT === "json" ? "json" : "pretty",
  level: process.env.LOG_LEVEL?.toUpperCase() as LoggerConfig["level"],
  colors: !process.env.NO_COLOR && Boolean(process.stdout.isTTY),
};

export const server = new Server({ logger })
  .use(database({ default: db }))
  .use(i18nConfig())
  .use(emailConfig())
  .use(authConfig())
  .use(mcpConfig())
  .base("/api")
  .load(modules);
