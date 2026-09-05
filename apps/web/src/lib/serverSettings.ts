import "server-only";

import type { FormFillSetting } from "@/features/Settings/types";

/**
 * The F8 form-fill toggle, read once per render on the server.
 *
 * Imported dynamically so the backend stays out of this app's module graph,
 * the way `serverTheme` resolves its own server. The fallback is the same one
 * the layout applies to the session: a build-time render has no database, and
 * a dev shortcut that stays off is the right answer when nothing can say
 * otherwise.
 */
export async function loadFormFillSetting(): Promise<FormFillSetting> {
  try {
    const { readFormFillEnabled } = await import(
      "@kafil/server/settings-bootstrap"
    );
    return { enabled: await readFormFillEnabled() };
  } catch (error) {
    // Announced rather than swallowed: "off" is also what a broken read looks
    // like, and a silent fallback would make an unreachable database
    // indistinguishable from a disabled shortcut. `najm-theme` reports its own
    // factory fallback the same way.
    console.warn("[kafil] form-fill setting unavailable; treating it as off", error);
    return { enabled: false };
  }
}
