import "server-only";

import { createReactServerUiBootstrap } from "najm-kit/server/react";

import { reportUiBootstrapDiagnostic, uiResources } from "./uiResources";

/**
 * The app's one request-scoped public UI bootstrap.
 *
 * Root and nested layouts must all reach this module-level instance so
 * branding and appearance resolve once and expose one stable render snapshot.
 * The server stays lazy so importing the resources in unit tests does not boot
 * the backend.
 */
const serverUi = createReactServerUiBootstrap({
  fetcher: async (path) => {
    const { server } = await import("@kafil/server");
    return server.fetch(new Request(`http://internal${path}`));
  },
  resources: uiResources,
  onDiagnostic: reportUiBootstrapDiagnostic,
});

export const loadServerUiBootstrap = serverUi.load;
export const {
  appearance: loadServerAppearance,
  branding: loadServerBranding,
} = serverUi.loaders;
