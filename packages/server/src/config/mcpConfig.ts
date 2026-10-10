import { mcp } from "najm-mcp";

export const mcpConfig = () =>
  mcp({
    name: "kafil-mcp",
    version: "0.1.0",
    auth: { type: "najm-auth" },
    cors: false,
  });
