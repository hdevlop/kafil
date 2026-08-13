import { Server, plugin, type LoggerConfig } from "najm-core";
import { database } from "najm-database";
import {
  authConfig,
  db,
  emailConfig,
  i18nConfig,
  mcpConfig,
  storageConfig,
  themeConfig,
} from "./config";
import * as modules from "./modules";

const managedImageControllers = [
  modules.CategoryImageController,
  modules.ChildImageController,
  modules.FamilyImageController,
  modules.OperatorImageController,
  modules.ProductImageController,
  modules.SponsorImageController,
  modules.StaffImageController,
] as const;

const managedImageControllerSet = new Set<unknown>(managedImageControllers);
const applicationModules = Object.fromEntries(
  Object.entries(modules).filter(([, value]) => !managedImageControllerSet.has(value)),
);

function managedImageRoutesConfig() {
  return plugin("kafil-managed-image-routes")
    .requires("guards")
    .services(managedImageControllers)
    .build();
}

const logger: LoggerConfig = {
  format: process.env.LOG_FORMAT === "json" ? "json" : "pretty",
  level: process.env.LOG_LEVEL?.toUpperCase() as LoggerConfig["level"],
  colors: !process.env.NO_COLOR && Boolean(process.stdout.isTTY),
};

function createServer() {
  return new Server({ logger })
    .use(database({ default: db }))
    .use(i18nConfig())
    .use(emailConfig())
    .use(authConfig())
    .use(mcpConfig())
    // Plugin services boot before application services. Register exact image
    // routes here so najm-storage's generic namespace wildcard cannot capture
    // them first.
    .use(managedImageRoutesConfig())
    // `theme()` resolves the storage service and the MCP registry from the
    // container, so both must be registered before it.
    .use(storageConfig())
    .use(themeConfig())
    .base("/api")
    .load(applicationModules);
}

// Next development reloads modules without replacing the Node.js process.
const serverKey = Symbol.for("kafil:server");
const globalState = globalThis as typeof globalThis & {
  [serverKey]?: ReturnType<typeof createServer>;
};

export const server =
  process.env.NODE_ENV === "production"
    ? createServer()
    : (globalState[serverKey] ??= createServer());
