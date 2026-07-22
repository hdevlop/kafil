import { mcp } from "najm-mcp";

export const mcpConfig = () =>
  mcp({
    name: "kafil-mcp",
    version: "0.1.0",
    path: "/mcp",
    cors: true,
  });
