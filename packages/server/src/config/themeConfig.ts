import { theme, type ThemeAuditSink, type ThemeDiagnostic } from "najm-theme/server";

import { kafilTheme, KAFIL_HERO_MAX_BYTES, KAFIL_LOGO_MAX_BYTES } from "@kafil/server/theme";
import { auditEvents } from "../modules/audit/auditSchema";
import { isAdmin } from "./authConfig";
import { db } from "./databaseConfig";

/**
 * Kafil's `najm-theme` registration.
 *
 * Everything here is configuration, and after the 0.2.0 cutover there is much
 * less of it. The design, the four factory marks, their MIME types, their byte
 * counts, their content hashes, and the routes they are served from all come
 * from `kafilTheme` — one `defineTheme(import.meta.url)` call over one
 * directory. Kafil supplies only what a package cannot know: who may change
 * things, where the bytes go, how big they may be, and where the audit row
 * lands.
 *
 * Gone with the old shape: `factory.appearance`, `factory.branding`, the
 * `brandingSlots` array rebuilt from `STANDARD_BRANDING_SLOTS`, the explicit
 * `schema` import, and `publicRead`.
 */

/**
 * Post-commit, not transactional.
 *
 * `audit_events` is the same database, so a transactional sink would be
 * possible — but Kafil's own settings services already recorded audit after the
 * commit, and promoting a log write to something that can roll back a saved
 * theme is a behavior change this adoption has no reason to make.
 *
 * The metadata the package hands over is a closed union of slot keys, group
 * names, preset identifiers, and counts. No design config, no file name, and no
 * image byte can reach this row.
 */
const themeAudit: ThemeAuditSink = {
  async record(event) {
    await db.insert(auditEvents).values({
      action: event.action,
      actorUserId: event.actorId,
      resource: "theme",
      resourceId: event.scopeId,
      metadata: {
        ...event.metadata,
        fromRevision: event.fromRevision,
        toRevision: event.toRevision,
        at: event.at,
      },
      requestId: null,
    });
  },
};

/**
 * Diagnostics are already sanitized by the package: a code, a scope, a short
 * package-authored detail, and a normalized error string. Nothing stored,
 * uploaded, or sent is in them, which is what makes logging them safe.
 */
function reportThemeDiagnostic(diagnostic: ThemeDiagnostic): void {
  console.warn(
    `[theme] ${diagnostic.code}${
      diagnostic.scopeId ? ` (scope ${diagnostic.scopeId})` : ""
    }${diagnostic.detail ? `: ${diagnostic.detail}` : ""}`,
    diagnostic.error ?? "",
  );
}

export const themeConfig = () =>
  theme(kafilTheme, {
    /**
     * Kafil's single compatibility override.
     *
     * Empty, so the routes stay where Kafil's clients already expect them:
     * `/api/appearance` and `/api/branding` behind the server's `/api` base
     * rather than the package default of `/api/theme/…`. `/api/theme-presets`
     * and `/api/branding/assets/serve/:f` keep a redirect for the rollback
     * window (see `themeCompatController`).
     */
    basePath: "",

    /**
     * One list, not three. `read` is deliberately omitted: the sign-in page,
     * the first-login page, and the public chrome all render before a session
     * exists, and appearance and branding are exactly the data that has to be
     * anonymous for those to look right. The public projection carries no admin
     * or storage field by construction.
     */
    manage: [isAdmin()],

    features: { mcp: true },

    limits: {
      logoBytes: KAFIL_LOGO_MAX_BYTES,
      heroBytes: KAFIL_HERO_MAX_BYTES,
      /**
       * `allowBuiltInPresetDeletion` is left at the package default of `false`.
       * Kafil's schema comment always said built-ins could not be deleted and
       * its service deleted them anyway; adopting the default resolves the
       * contradiction in the direction the comment already documented.
       */
    },

    storage: { namespace: "theme-branding" },
    audit: themeAudit,
    diagnostics: reportThemeDiagnostic,
  });
