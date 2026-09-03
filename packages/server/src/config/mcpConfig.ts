import { mcp } from "najm-mcp";

export const mcpConfig = () =>
  mcp({
    name: "kafil-mcp",
    version: "0.1.0",
    path: "/mcp",
    auth: { type: "najm-auth" },
    cors: false,
    exposeErrorDetails: false,
  });
