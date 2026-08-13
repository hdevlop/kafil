import { theme, type ThemeAuditSink, type ThemeDiagnostic } from "najm-theme/server";

import { kafilTheme, KAFIL_HERO_MAX_BYTES, KAFIL_LOGO_MAX_BYTES } from "@kafil/server/theme";
import { auditEvents } from "../modules/audit/auditSchema";
import { isAdmin } from "./authConfig";
import { db } from "./databaseConfig";

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
    basePath: "",
    manage: [isAdmin()],
    features: { mcp: true },
    limits: {
      logoBytes: KAFIL_LOGO_MAX_BYTES,
      heroBytes: KAFIL_HERO_MAX_BYTES,
    },

    storage: { namespace: "theme-branding" },
    audit: themeAudit,
    diagnostics: reportThemeDiagnostic,
  });
