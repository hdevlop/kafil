---
name: kafil-najm-frontend
description: Build, refactor, review, or test Kafil frontend work in apps/web using the installed Next.js and Najm packages. Use for routes, feature pages, components, forms, tables, dialogs, cards, navigation, authorization-aware presentation, React Query, Zustand UI state, responsive design, localization, or browser workflows. Require Najm Kit components and verified installed contracts instead of hand-built UI substitutes.
---

# Kafil Najm Frontend

## Preflight

1. Read the root `AGENTS.md` and the active implementation plan completely.
2. Inspect the current feature, route, service, hook, tests, and shared wrappers before editing.
3. Read the relevant Next.js 16 guide under
   `apps/web/node_modules/next/dist/docs/` before changing routes, layouts,
   navigation, metadata, caching, server/client boundaries, or proxy behavior.
4. Verify installed package contracts from local declarations and documentation:

   ```text
   node_modules/najm-kit/README.md
   node_modules/najm-kit/dist/index.d.ts
   apps/web/node_modules/najm-auth/dist/**/*.d.ts
   ```

5. Treat current declarations as authoritative. Do not invent props, exports,
   icon formats, or hooks from memory.

## Use Najm Kit for the UI

- Compose every feature UI from Najm Kit components and existing Kafil wrappers.
- Prefer `NPageLayout`, the shared `DashboardPageHeader`, `NTable`, `NCard`,
  `NButton`, `NForm`, `FormInput`, Najm dialogs/sheets, badges, progress,
  scroll, dropdown, tooltip, and feedback components when the installed package
  exports the required behavior.
- Do not hand-build a button, input, select, checkbox, table, card, dialog,
  sheet, dropdown, tooltip, badge, progress indicator, or toast when Najm Kit
  provides an equivalent.
- Use native HTML only for semantic structure or behavior with no appropriate
  Najm Kit primitive. Keep the exception small and explain it in the handoff.
- Reuse Kafil wrappers such as page headers, page states, global header actions,
  formatting helpers, query/command hooks, branding, and language providers.
- Use Lucide icon components in the format required by the verified Najm Kit
  type. Do not guess whether a prop accepts a string or component.
- Use token-backed classes such as `bg-background`, `bg-card`, `text-foreground`,
  `text-muted-foreground`, `border-border`, and semantic status tokens. Do not
  fork the design system with arbitrary colors, radii, shadows, or raw Radix
  styling.
- Fix reusable visual or contract gaps in Najm Kit when that is the real shared
  boundary. Do not accumulate Kafil-only copies of a missing shared primitive.

## Keep One Feature Implementation

- Keep route files thin and feature-owned code under `apps/web/src/features`.
- Use one page component for a shared product surface. Add authorized controls
  inside it; do not create admin/operator/family copies.
- Use `Can` or the verified Najm Auth capability API for presentation only.
- Keep backend authorization authoritative. Never treat a hidden control,
  column, menu, or route link as a security boundary.
- Resolve command ownership from the exact authenticated principal. Admin may
  satisfy several guards but does not thereby own a family profile.
- Keep product cards presentational or connect them to a shared feature hook.
  Never hard-wire a reusable card to a family-only or operator-only mutation.

## State and Data

- Keep server data in React Query. Use the existing `useEntityQuery` and
  `useEntityCommand` patterns and invalidate every affected cache family.
- Use Zustand only for genuinely client-owned transient state shared across
  routes, such as the assisted order draft.
- Do not copy a server-owned family cart into Zustand as a second source of
  truth.
- Bind persisted client state to the authenticated user, clear it on identity
  change/logout/success, and avoid persisting sensitive family selection.
- Treat client prices and totals as estimates. Let the backend revalidate and
  recalculate financial commands.
- Use Zod plus Najm Kit form primitives. Preserve server field names and command
  DTOs; adapt form-only representations at the submission boundary.
- Await mutations that control dialog closure or navigation. Handle rejected
  promises after the shared command hook presents its error.

## Accessibility, Responsive UI, and Localization

- Implement keyboard operation, focus restoration, accessible names, live
  updates, error announcements, and disabled/pending states.
- Verify card and table modes separately; table column visibility does not hide
  card content automatically.
- Build mobile-first, test floating controls against safe areas, and verify RTL
  layout and horizontally scrolling controls.
- Put user-visible copy in the existing en/fr/ar/es translation system unless
  the task explicitly excludes localization.
- Use shared money, date, time-zone, and localized-number formatters.

## Browser MCP Servers

Two browser MCP servers are wired in the project `opencode.json` and the
`~/.config/opencode/opencode.json` user config. Pick by intent, not by habit:

- **Playwright MCP** (`playwright`, `@playwright/mcp@latest`) — default, enabled.
  Use for cross-browser flows, form-fill exploration, E2E smoke discovery, and
  anything that mirrors `apps/web/test/e2e/`. Operates on the accessibility tree
  (no vision model). Prefers ref-based interactions over coordinates.
- **Chrome DevTools MCP** (`chrome-devtools`, `chrome-devtools-mcp@latest`) —
  opt-in via `enabled: true` when needed. Use for perf traces, Lighthouse,
  console + network introspection, heap snapshots, and screencast. Chrome only.

Rules when driving a browser via MCP:

- Prefer Playwright MCP for the default workflow. It mirrors the in-repo
  Playwright suite (`apps/web/test/e2e/`) and is what the F8 form-fill shortcut
  uses.
- Enable Chrome DevTools MCP only when the task requires real DevTools
  diagnostics (Lighthouse audit, performance trace, memory diff, screenshots
  with source-mapped console). Disable it again after the slice to keep the
  tool surface lean.
- Never run a real browser MCP against production Kafil infrastructure. Use the
  dev server on `http://127.0.0.1:3000` (or `3210` for the e2e harness) or
  against seeded fixtures.
- Pair MCP-driven exploration with the existing Playwright suites. Promote any
  repeatable flow into `apps/web/test/e2e/` so future slices run on CI.
- For long-running tasks, launch the server in standalone mode with `--port`
  and connect via `url` to avoid spawning a new browser per session.
- Use `--isolated` (or `--user-data-dir` per workspace) when running concurrent
  browsers so persistent profiles do not collide.
- Add `--no-usage-statistics` to Chrome DevTools MCP in CI environments; the
  committed config already does this.

Standard configs (kept in `opencode.json`):

```json
{
  "mcp": {
    "playwright": {
      "type": "local",
      "command": ["bunx", "--bun", "@playwright/mcp@latest"],
      "enabled": true
    },
    "chrome-devtools": {
      "type": "local",
      "command": ["bunx", "--bun", "chrome-devtools-mcp@latest", "--no-usage-statistics"],
      "enabled": false
    }
  }
}
```

The MCP commands are launched via `bunx --bun` (the project's standard
toolchain) so they run under Bun and bypass the root `overrides` that `npx`
would otherwise trip against `najm-core`.

## Verification

Run focused tests while iterating. Close an implementation slice with:

```text
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run build
```

Run the relevant production browser workflow for routing, auth, dialogs,
responsive behavior, or cross-route state. Then run the root gate required by
`AGENTS.md`. Report exact commands and results. If the user explicitly forbids
build, lint, or tests, do not run them and report validation as unperformed.
