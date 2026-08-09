import {
  DEFAULT_APPEARANCE_REVISION as SERVER_DEFAULT_APPEARANCE_REVISION,
  getFactoryDesignConfig as getServerFactoryDesignConfig,
  parseAppearanceDesignConfig,
} from "@kafil/server/appearance";
import { getFactoryBranding } from "@kafil/server/branding";
import type { NajmDesignConfig } from "najm-kit";
import type { UiBootstrapDiagnostic, UiBootstrapResource } from "najm-kit/server";
import type { PublicAppearance } from "@/types/appearance";
import type { PublicBranding } from "@/types/branding";

/**
 * Kafil's half of the public UI bootstrap: endpoints, payload validation, and
 * factory values. The loading, envelope, fallback, and diagnostic mechanics
 * belong to `najm-kit/server`; the file stays free of `server-only` so tests
 * can reach the parsers without booting the backend.
 */

export const DEFAULT_APPEARANCE_REVISION = SERVER_DEFAULT_APPEARANCE_REVISION;

export function getFactoryDesignConfig(): NajmDesignConfig {
  return getServerFactoryDesignConfig();
}

function factoryAppearance(): PublicAppearance {
  return {
    designConfig: getFactoryDesignConfig(),
    revision: DEFAULT_APPEARANCE_REVISION,
  };
}

function isPositiveRevision(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function parsePublicBranding(input: unknown): PublicBranding | undefined {
  if (!input || typeof input !== "object") return undefined;
  const branding = input as Record<string, unknown>;
  if (
    !isPositiveRevision(branding.revision) ||
    typeof branding.sidebarLogoExpandedPath !== "string" ||
    typeof branding.sidebarLogoCollapsedPath !== "string" ||
    typeof branding.authLogoPath !== "string" ||
    typeof branding.authHeroImagePath !== "string"
  ) {
    return undefined;
  }
  return {
    authHeroImagePath: branding.authHeroImagePath,
    authLogoPath: branding.authLogoPath,
    revision: branding.revision,
    sidebarLogoCollapsedPath: branding.sidebarLogoCollapsedPath,
    sidebarLogoExpandedPath: branding.sidebarLogoExpandedPath,
  };
}

function parsePublicAppearance(input: unknown): PublicAppearance | undefined {
  if (!input || typeof input !== "object") return undefined;
  const appearance = input as Record<string, unknown>;
  if (!isPositiveRevision(appearance.revision)) return undefined;
  return {
    designConfig: parseAppearanceDesignConfig(appearance.designConfig),
    revision: appearance.revision,
  };
}

export const appearanceResource: UiBootstrapResource<PublicAppearance> = {
  path: "/api/appearance",
  parse: parsePublicAppearance,
  fallback: factoryAppearance,
};

export const brandingResource: UiBootstrapResource<PublicBranding> = {
  path: "/api/branding",
  parse: parsePublicBranding,
  fallback: getFactoryBranding,
};

export const uiResources = {
  appearance: appearanceResource,
  branding: brandingResource,
};

/** Public chrome degrades to factory assets rather than failing the render. */
export function reportUiBootstrapDiagnostic(
  diagnostic: UiBootstrapDiagnostic,
): void {
  const fallback =
    diagnostic.resource === "appearance" ? "factory theme" : "factory assets";
  console.warn(
    `[${diagnostic.resource}] server load ${diagnostic.reason}${
      diagnostic.status ? ` (${diagnostic.status})` : ""
    }; using ${fallback}`,
    diagnostic.error ?? "",
  );
}
