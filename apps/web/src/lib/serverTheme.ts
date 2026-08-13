import "server-only";

import { kafilTheme } from "@kafil/server/theme";

const serverTheme = kafilTheme.react({
  getServer: async () => (await import("@kafil/server")).server,
  basePath: "/api",
});

export const loadServerTheme = serverTheme.load;
export const loadServerAppearance = serverTheme.loadAppearance;
export const loadServerBranding = serverTheme.loadBranding;
