// ============================================================================
// Kafil — the factory theme
// ============================================================================
//
// One directory, and this is all of it. `theme.json` next door holds the design
// this deployment ships with; the four fixed image names hold the marks.
// `defineTheme` reads and validates them relative to *this file*, so the same
// definition resolves from `bun run dev`, from a workspace script, from the
// Next server bundle, and from the production container — none of which share a
// working directory.
//
// `sidebar-logo-collapsed` and `auth-logo` are byte-identical copies of
// `sidebar-logo-expanded`. Before 0.2.0 those two slots carried no factory
// value and resolved through a declared `inheritFrom: "sidebarLogoExpanded"`;
// 0.2.0 requires all four files, so the duplication is what preserves the
// behaviour operators already see — the same mark on the expanded rail, the
// collapsed rail, and the sign-in page. Replacing any one of them is still a
// managed upload against that single slot.
//
// Nothing else about branding lives in Kafil any more. No asset paths, no slot
// names, no route prefixes, no fallback map, no factory callbacks.
// ============================================================================

import { defineTheme } from "najm-theme/theme";

/**
 * Kafil's ceilings, declared rather than inherited.
 *
 * The package defaults are 512 KB for a logo and 2 MB for a hero. Kafil has
 * shipped 2 MB / 5 MB since branding existed, and assets already stored under
 * the old limits must stay legal after the cutover — a tighter default would
 * reject an upload that used to succeed, which reads as a regression rather
 * than as a policy. The same numbers are passed to the plugin, so the factory
 * files and a managed upload are held to one ceiling.
 */
export const KAFIL_LOGO_MAX_BYTES = 2_000_000;
export const KAFIL_HERO_MAX_BYTES = 5_000_000;

export const kafilTheme = defineTheme(import.meta.url, {
  limits: { logoBytes: KAFIL_LOGO_MAX_BYTES, heroBytes: KAFIL_HERO_MAX_BYTES },
});
