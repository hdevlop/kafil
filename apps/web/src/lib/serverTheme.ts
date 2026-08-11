import "server-only";

import { kafilTheme } from "@kafil/server/theme";

/**
 * The app's single request-scoped theme bootstrap.
 *
 * Root, auth, and first-login layouts must all reach this module-level instance
 * so appearance and branding resolve once and expose one stable render
 * snapshot. Calling `kafilTheme.react()` inside a component would build a fresh
 * entry per call and quietly cost one round trip each.
 *
 * Note what is no longer here: no factory design callback, no factory branding
 * callback, no asset paths. All of that is the definition's, which is the same
 * object the backend plugin is registered with — so the design the build ships
 * and the marks it serves cannot drift between the two processes.
 *
 * `basePath` stays `/api` because Kafil mounts the plugin with an empty plugin
 * `basePath` behind the server's `/api` base. The resulting routes remain
 * `/api/appearance` and `/api/branding`, not `/api/theme/…`, and the factory
 * assets are served from `/api/branding/factory/…`.
 *
 * `getServer` is lazy on purpose. The Najm server opens a database and boots
 * every plugin; importing it eagerly from a module the whole app depends on
 * would do that during the Next build's module graph evaluation.
 */
const serverTheme = kafilTheme.react({
  getServer: async () => (await import("@kafil/server")).server,
  basePath: "/api",
});

export const loadServerTheme = serverTheme.load;
export const loadServerAppearance = serverTheme.loadAppearance;
export const loadServerBranding = serverTheme.loadBranding;
