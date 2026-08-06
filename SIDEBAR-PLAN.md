# Sidebar & DashboardShell Cleanup Plan

Goal: collapse the four per-role nav builders into one declarative array, stop
threading `t()` through five functions, and move the reusable parts of the shell
into `najm-kit`.

Current state: [`apps/web/src/shared/DashboardShell/index.tsx`](apps/web/src/shared/DashboardShell/index.tsx)
is 315 lines, ~125 of which are four nav builders that repeat the same rows.

| Phase | Scope | Needs a najm-kit publish? | Status |
| --- | --- | --- | --- |
| 1 | App-only: nav array, `t`-free navigation, footer actions as data, a11y labels | No | **Done.** New `navigation.ts`, full gate green |
| 2 | najm-kit: sidebar context, logo render prop | 2.6.2 — published | **Done.** Wrapper deleted, 17 imports de-aliased, full gate green |
| 2b | Footer actions array | Yes | Deferred — low payoff for the API churn |
| 3 | Optional kit polish: `section` ids, `activeMatch`, label bundle | Yes | Not started |

## What shipped

**najm-kit 2.6.2** (`Desktop/najm/packages/najm-kit/src/`):

- `components/sidebar/NSidebarContext.tsx` — `NSidebarProvider` / `useNSidebar`
- `components/sidebar/NSidebar.tsx` — state precedence prop → context → internal, plus the `logo` render prop
- `components/layout/NPageHeader.tsx` — `onSidebarOpen` and `mobileBreakpoint` default from context
- `types.ts`, both barrels, `CHANGELOG.md`

Kit gates: typecheck ✅ · lint ✅ · 796 tests / 0 fail ✅ · build ✅
Playground demo: `apps/playground/src/app/sidebar-context/page.tsx`

**Kafil:**

- `DashboardShell` splits into an outer provider wrapper and `DashboardShellBody`,
  which reads the sidebar with `useNSidebar`. Both `mobileOpen` and
  `sidebarCollapsed` state are gone; `mobileBreakpoint` is declared once.
- `logo` is a render prop, so the `lg:hidden xl:block` arithmetic is gone.
- `DashboardPageHeader.tsx` deleted; 17 files now import `NPageHeader` from
  `najm-kit` directly.
- `branding-consumers.test.ts` asserts the shell does **not** contain
  `sidebarCollapsed`, so the mirrored state cannot creep back.

Kafil gates: lint ✅ · typecheck ✅ · 318 web tests / 0 fail ✅ · build ✅

### Still unverified in a browser

The mobile hamburger below 1024px is the behaviour that changed for every page
header, and RTL under `ar` has not been re-checked since the shell was restructured.

⚠️ `bun run api:check` fails in the najm repo, pre-existing and unrelated:
`docs/api/public-api.snapshot.json` does not exist and is not tracked in git at
all. Do not generate it as a side effect of this work — snapshotting the entire
current public surface is its own decision.

---

## READ THIS BEFORE TOUCHING index.tsx

Six tests assert on the **source text** of `DashboardShell/index.tsx`. They will
fail on any refactor that moves the wrong line. Phase 1 is designed to keep five
of the six passing untouched — do not "tidy" past them.

| Test | Asserted substring | Rule |
| --- | --- | --- |
| [`phase6-foundation.test.ts:176`](apps/web/test/phase6-foundation.test.ts#L176) | `window.location.replace("/login")` | Keep the sign-out handler inline in `index.tsx`. Do not extract it. |
| [`shared-authorization.test.ts:53`](apps/web/test/shared-authorization.test.ts#L53) | `<KafilRoleProvider role={user.role}>` | Keep that JSX verbatim, same prop spelling. |
| [`global-settings-sheet.test.ts:64-65`](apps/web/test/global-settings-sheet.test.ts#L64-L65) | `<GlobalSettingsSheet`, `canOpenGlobalSettings(user.role)` | Keep both in `index.tsx`. **Do not extract the overlays into a `DashboardOverlays` component.** |
| [`branding-consumers.test.ts:12-19`](apps/web/test/branding-consumers.test.ts#L12-L19) | `sidebarCollapsed`, `onCollapsedChange={setSidebarCollapsed}`, both `BrandingImage` blocks | **Phase 1 must not touch the logo block or the `sidebarCollapsed` state.** Phase 2 changes it and updates this test. |
| [`phase7-dashboard-feature.test.ts:18-23`](apps/web/test/phase7-dashboard-feature.test.ts#L18-L23) | `<NajmScroll axis="y" className="min-h-0 flex-1">`, `className="flex h-screen w-full overflow-hidden` | Keep the layout scaffolding. This is also why we are **not** adopting `NAppShell`. |
| [`applicants-feature.test.ts:206-207`](apps/web/test/applicants-feature.test.ts#L206-L207) | `href: "/applicants"`, `includeApplicants` | **This one must change in Phase 1** — see step 1.5. |

---

# Phase 1 — App only, no publish

## 1.1 New file: `apps/web/src/shared/DashboardShell/navigation.ts`

Pure data + pure functions. No React, no `t`, no `"use client"`.

```ts
import {
   Baby,
   ClipboardCheck,
   ClipboardList,
   HandCoins,
   HeartHandshake,
   House,
   KeyRound,
   LayoutDashboard,
   PackageSearch,
   ShieldCheck,
   ShoppingBag,
   Tags,
   UserRound,
   UsersRound,
} from "lucide-react";
import type { NavItem } from "najm-kit";
import type { ComponentType } from "react";

import type { TranslationKey } from "@/i18n/translations";
import { UserShieldIcon } from "@/shared/icons/UserShieldIcon";

export type DashboardRole = "admin" | "operator" | "family" | "sponsor";

type NavIcon = ComponentType<{ className?: string }>;

const ALL_ROLES = ["admin", "operator", "family", "sponsor"] as const;

/**
 * Section metadata lives here once. Rows below reference a section by id, so a
 * heading can never drift out of sync with the items under it.
 */
const NAV_SECTIONS = {
   support: { labelKey: "nav.supportOperations", icon: HeartHandshake },
   household: { labelKey: "nav.household", icon: House },
   finance: { labelKey: "nav.finance", icon: HandCoins },
   catalog: { labelKey: "nav.catalogOperations", icon: PackageSearch },
   access: { labelKey: "nav.accessManagement", icon: ShieldCheck },
   sponsorAll: { labelKey: "nav.supportAndFinance", icon: HeartHandshake },
} satisfies Record<string, { labelKey: TranslationKey; icon: NavIcon }>;

type SectionId = keyof typeof NAV_SECTIONS;

interface DashboardNavRow {
   href: string;
   labelKey: TranslationKey;
   icon: NavIcon;
   roles: readonly DashboardRole[];
   /**
    * The section this row opens. A bare string applies to every role; the record
    * form covers the three rows that sit in different sections per role (a role
    * left out of the record inherits whichever section is already open).
    */
   section?: SectionId | Partial<Record<DashboardRole, SectionId>>;
}

/**
 * One table, in render order. Filtering by role reproduces every current
 * per-role ordering exactly — that is why the order below must not be shuffled.
 */
const DASHBOARD_NAV: readonly DashboardNavRow[] = [
   {
      href: "/dashboard",
      labelKey: "nav.overview",
      icon: LayoutDashboard,
      roles: ALL_ROLES,
   },
   {
      href: "/family",
      labelKey: "nav.families",
      icon: UsersRound,
      roles: ["admin", "operator", "sponsor"],
      section: { admin: "support", operator: "support", sponsor: "sponsorAll" },
   },
   {
      href: "/children",
      labelKey: "nav.children",
      icon: Baby,
      roles: ["admin", "operator", "family"],
      section: { admin: "support", operator: "support", family: "household" },
   },
   {
      href: "/sponsors",
      labelKey: "nav.sponsors",
      icon: UserRound,
      roles: ["admin", "operator"],
   },
   {
      href: "/staff",
      labelKey: "nav.staff",
      icon: UserShieldIcon,
      roles: ["admin"],
   },
   {
      href: "/assignments",
      labelKey: "nav.assignments",
      icon: HeartHandshake,
      roles: ["admin", "operator"],
   },
   {
      href: "/applicants",
      labelKey: "nav.applicants",
      icon: ClipboardList,
      roles: ["admin"],
   },
   {
      href: "/contribution",
      labelKey: "nav.contributions",
      icon: HandCoins,
      roles: ALL_ROLES,
      // Sponsor is absent on purpose: contributions stay inside the sponsor's
      // single "Support" group instead of opening a Finance heading.
      section: { admin: "finance", operator: "finance", family: "finance" },
   },
   {
      href: "/categories",
      labelKey: "nav.categories",
      icon: Tags,
      roles: ["admin", "operator", "family"],
      section: "catalog",
   },
   {
      href: "/products",
      labelKey: "nav.products",
      icon: ShoppingBag,
      roles: ["admin", "operator", "family"],
   },
   {
      href: "/orders",
      labelKey: "nav.orders",
      icon: ClipboardCheck,
      roles: ALL_ROLES,
   },
   {
      href: "/users",
      labelKey: "nav.users",
      icon: UsersRound,
      roles: ["admin"],
      section: "access",
   },
   {
      href: "/roles",
      labelKey: "nav.roles",
      icon: ShieldCheck,
      roles: ["admin"],
   },
   {
      href: "/permissions",
      labelKey: "nav.permissions",
      icon: KeyRound,
      roles: ["admin"],
   },
];

function isDashboardRole(role: string | null | undefined): role is DashboardRole {
   return (ALL_ROLES as readonly string[]).includes(role ?? "");
}

function resolveSection(
   row: DashboardNavRow,
   role: DashboardRole,
): SectionId | undefined {
   if (!row.section) return undefined;
   return typeof row.section === "string" ? row.section : row.section[role];
}

/**
 * Returns nav items whose `label` and `sectionLabel` hold **translation keys**,
 * not translated strings. `useDashboardNavigation` applies `t` once at the edge;
 * keeping this function pure is what lets the tests assert on it without a fake
 * translator.
 *
 * najm-kit's `buildGroups` only starts a new group when an item carries a
 * `sectionLabel`, so the heading is stamped onto the first *surviving* row of
 * each run — after role filtering, never before.
 */
export function getDashboardNavigation(
   role: string | null | undefined,
): NavItem[] {
   if (!isDashboardRole(role)) return [];

   const items: NavItem[] = [];
   let openSection: SectionId | undefined;

   for (const row of DASHBOARD_NAV) {
      if (!row.roles.includes(role)) continue;

      const section = resolveSection(row, role);
      const startsSection = section !== undefined && section !== openSection;
      if (section !== undefined) openSection = section;

      items.push({
         id: row.href,
         href: row.href,
         icon: row.icon,
         label: row.labelKey,
         ...(startsSection
            ? {
               sectionLabel: NAV_SECTIONS[section].labelKey,
               sectionIcon: NAV_SECTIONS[section].icon,
            }
            : {}),
      });
   }

   return items;
}

/** The single `t()` call site for the whole sidebar. */
export function translateDashboardNavigation(
   items: NavItem[],
   t: (key: TranslationKey) => string,
): NavItem[] {
   return items.map((item) => ({
      ...item,
      label: t(item.label as TranslationKey),
      ...(item.sectionLabel
         ? { sectionLabel: t(item.sectionLabel as TranslationKey) }
         : {}),
   }));
}

/**
 * Every nav destination is a flat route now, so an item is active for its own
 * path and anything nested under it. The per-route special cases this replaced
 * existed to map `/family/catalog` and `/family/cart` onto Products, and to stop
 * `/family` matching them — both gone with those routes.
 */
export function isDashboardNavigationActive(item: NavItem, pathname: string) {
   if (!item.href) return false;
   return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
```

### Why the label holds a key

Every existing test already passes `((key: string) => key) as never` as the
translator, so it asserts against raw keys today. Returning keys means
**all existing assertions keep passing verbatim** — only the now-extra second
argument has to go. That is the whole migration.

### Verify the output is byte-identical

The filtered array reproduces the current per-role output exactly. Sanity-check
against the four builders before moving on:

| Role | Items in order | Section headings in order |
| --- | --- | --- |
| operator | dashboard, family, children, sponsors, assignments, contribution, categories, products, orders | supportOperations, finance, catalogOperations |
| admin | + staff (after sponsors), applicants (after assignments), users, roles, permissions | supportOperations, finance, catalogOperations, accessManagement |
| family | dashboard, children, contribution, categories, products, orders | household, finance, catalogOperations |
| sponsor | dashboard, family, contribution, orders | supportAndFinance |

## 1.2 `includeStaff` / `includeApplicants` are dead

Both parameters are only ever `true` when `role === "admin"`
([index.tsx:179](apps/web/src/shared/DashboardShell/index.tsx#L179)). In the
array they collapse to `roles: ["admin"]`. Delete the parameters, the conditional
spreads, and the `ReturnType<typeof useKafilLanguage>["t"]` type annotation that
is currently spelled out four times.

Also delete the `id` field from the data: it equals `href` on all 14 rows and is
derived in `getDashboardNavigation`.

## 1.3 Rewrite `index.tsx`

Delete lines 25–195 (the four builders, `getDashboardNavigation`, and
`isDashboardNavigationActive`) and re-export from the new module so the test
imports from `"../src/shared/DashboardShell"` keep resolving:

```tsx
export {
   getDashboardNavigation,
   isDashboardNavigationActive,
} from "./navigation";
```

Then the footer actions become data too. Add above the component:

```tsx
const SIDEBAR_ACTION_CLASS =
   "w-full justify-start gap-2 lg:justify-center lg:px-0 xl:justify-start xl:px-3";

interface SidebarActionProps {
   icon: ComponentType<{ className?: string }>;
   label: string;
   onClick?: () => void;
}

function SidebarAction({ icon: Icon, label, onClick }: SidebarActionProps) {
   return (
      <NButton
         className={SIDEBAR_ACTION_CLASS}
         size="sm"
         variant="ghost"
         onClick={onClick}
      >
         <Icon className="size-4" />
         <span className="lg:hidden xl:inline">{label}</span>
      </NButton>
   );
}
```

Inside the component, build the footer from an array. Note `wrap` — najm-auth's
`SignOutButton` wraps its child, so that row needs an escape hatch rather than an
`onClick`:

```tsx
const footerActions = [
   {
      id: "profile",
      icon: UserRound,
      label: t("sponsor.profile.open"),
      show: user.role === "sponsor",
      onClick: () => {
         setMobileOpen(false);
         openSponsorProfileSheet();
      },
   },
   {
      id: "settings",
      icon: Settings2,
      label: t("nav.settings"),
      show: canOpenGlobalSettings(user.role),
      onClick: () => {
         setMobileOpen(false);
         setSettingsOpen(true);
      },
   },
   {
      id: "signOut",
      icon: LogOut,
      label: t("action.signOut"),
      show: true,
      wrap: (node: React.ReactNode) => (
         <SignOutButton
            onSuccess={() => {
               window.location.replace("/login");
            }}
         >
            {node}
         </SignOutButton>
      ),
   },
].filter((action) => action.show);
```

`window.location.replace("/login")` stays literally in this file — see the
constraints table.

Render it:

```tsx
footer={
   <div className="space-y-1">
      {footerActions.map(({ id, icon, label, onClick, wrap }) => {
         const button = <SidebarAction icon={icon} label={label} onClick={onClick} />;
         return <Fragment key={id}>{wrap ? wrap(button) : button}</Fragment>;
      })}
   </div>
}
```

And the nav itself:

```tsx
const navItems = useMemo(
   () => translateDashboardNavigation(getDashboardNavigation(user.role), t),
   [t, user.role],
);
```

**Leave the `logo={...}` block, `sidebarCollapsed`, the outer `div`, the
`NajmScroll`, and the three overlays exactly as they are.** They are pinned by
the constraints table and by Phase 2.

## 1.4 Translate the sidebar's a11y labels (standalone bug fix)

`hamburgerLabel`, `closeLabel`, `collapseLabel` and `expandLabel` all default to
English inside najm-kit and `DashboardShell` passes none of them, so screen
readers announce "Collapse" in `ar`, `fr` and `es`.

Add a `sidebar` block as a sibling of `nav` inside the `ui` object, in **all
four** of `packages/server/src/locales/{en,fr,ar,es}.json` — the locale parity
test ([`packages/server/test/locale-parity.test.ts`](packages/server/test/locale-parity.test.ts))
fails if any locale is missing a key:

```jsonc
// en.json → ui.sidebar
"sidebar": { "open": "Open sidebar", "close": "Close sidebar", "collapse": "Collapse", "expand": "Expand" }
// fr.json
"sidebar": { "open": "Ouvrir le menu", "close": "Fermer le menu", "collapse": "Réduire", "expand": "Développer" }
// ar.json
"sidebar": { "open": "فتح القائمة الجانبية", "close": "إغلاق القائمة الجانبية", "collapse": "طي", "expand": "توسيع" }
// es.json
"sidebar": { "open": "Abrir menú lateral", "close": "Cerrar menú lateral", "collapse": "Contraer", "expand": "Expandir" }
```

Then pass them on `<NSidebar>`:

```tsx
hamburgerLabel={t("sidebar.open")}
closeLabel={t("sidebar.close")}
collapseLabel={t("sidebar.collapse")}
expandLabel={t("sidebar.expand")}
```

## 1.5 Test migration — exact edits

**Mechanical (drop the second argument only, no assertion changes):**

- [`admin-access-feature.test.ts:8-10`](apps/web/test/admin-access-feature.test.ts#L8-L10) — delete the `translate` const, call `getDashboardNavigation("operator")` / `("admin")`.
- [`staff-feature.test.ts:18-30`](apps/web/test/staff-feature.test.ts#L18-L30) — two calls.
- [`phase7-dashboard-feature.test.ts`](apps/web/test/phase7-dashboard-feature.test.ts) — six calls at lines 27, 49, 80, 91, 132.

**Needs a real edit:**

`configurable-funding-feature.test.ts:110-117` builds its translator from
`Parameters<typeof getDashboardNavigation>[1]`, which no longer exists:

```ts
// before
const t = ((key: string) => key) as Parameters<typeof getDashboardNavigation>[1];
expect(getDashboardNavigation("operator", t).map((item) => item.href)).not.toContain("/settings");

// after
expect(getDashboardNavigation("operator").map((item) => item.href)).not.toContain("/settings");
```

`applicants-feature.test.ts:206-207` asserts on shell source text that has moved
to `navigation.ts` and on the now-deleted `includeApplicants` flag. Replace the
string matching with a behavioural assertion:

```ts
// before
expect(sidebar).toContain('href: "/applicants"');
expect(sidebar).toContain("includeApplicants");

// after — drop the `sidebar` source read entirely and import getDashboardNavigation
expect(getDashboardNavigation("admin").map((item) => item.href)).toContain("/applicants");
expect(getDashboardNavigation("operator").map((item) => item.href)).not.toContain("/applicants");
```

**Worth adding** — one test that locks the ordering table from 1.1, since that is
the invariant the whole array model rests on:

```ts
test("filtering the nav table reproduces each role's ordering and headings", () => {
   expect(getDashboardNavigation("sponsor").map((i) => i.href)).toEqual([
      "/dashboard", "/family", "/contribution", "/orders",
   ]);
   expect(
      getDashboardNavigation("sponsor").filter((i) => i.sectionLabel).map((i) => i.sectionLabel),
   ).toEqual(["nav.supportAndFinance"]);
});
```

## 1.6 Try deleting `LinkAdapter`

`LinkAdapter` ([index.tsx:157-173](apps/web/src/shared/DashboardShell/index.tsx#L157-L173))
may be unnecessary: najm-kit's `LinkComponentType` wants `href: string`, and
Next's `Link` accepts `href: string | UrlObject`, so it is plausibly assignable
already. Two-minute check:

```tsx
linkComponent={Link}
```

If `bun run typecheck` passes, delete the component and **move its comment onto
that line** — it explains why this is not a plain `<a>`, which is load-bearing
knowledge (a plain anchor destroys the in-memory React Query cache on every
sidebar click). If it fails, keep the adapter and fix it properly in Phase 3.

---

# Phase 2 — najm-kit 2.6.1 → 2.6.2

Source lives at `C:\Users\hdevlop\Desktop\najm\packages\najm-kit\src\components\sidebar\`.
Reproduce each change in `apps/playground` and let the user look at it before
publishing; publish with `--patch`.

## 2.1 Sidebar context — the biggest win

`DashboardSidebarProvider` + `DashboardPageHeader` exist only to hand
`setMobileOpen` down to page headers. That is a generic app-shell concern.

**Payoff:** deletes all 44 lines of
[`DashboardPageHeader.tsx`](apps/web/src/shared/DashboardShell/DashboardPageHeader.tsx),
and turns `import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader"`
back into a plain `najm-kit` import in **20 feature files**. It also kills the
`mobileBreakpoint="lg"` that is currently written in two places and can drift.

New file `src/components/sidebar/NSidebarContext.tsx`.

**The provider owns the state — it does not forward a caller-built value.** A
pass-through provider has to memoize on the value's fields, which silently drops
changed callback identities and serves stale closures. Owning two booleans and
exposing functional-update setters avoids the whole class of bug:

```tsx
"use client";

import {
   createContext,
   useCallback,
   useContext,
   useMemo,
   useState,
   type ReactNode,
} from "react";

export interface NSidebarContextValue {
   collapsed: boolean;
   mobileOpen: boolean;
   openMobile: () => void;
   closeMobile: () => void;
   setCollapsed: (collapsed: boolean) => void;
   toggleCollapsed: () => void;
   mobileBreakpoint: "sm" | "md" | "lg";
}

const NSidebarContext = createContext<NSidebarContextValue | null>(null);

/** Returns null outside a provider so NSidebar can fall back to internal state. */
export function useNSidebar(): NSidebarContextValue | null {
   return useContext(NSidebarContext);
}

export function NSidebarProvider({
   children,
   defaultCollapsed = false,
   mobileBreakpoint = "md",
}: Readonly<{
   children: ReactNode;
   defaultCollapsed?: boolean;
   mobileBreakpoint?: "sm" | "md" | "lg";
}>) {
   const [collapsed, setCollapsed] = useState(defaultCollapsed);
   const [mobileOpen, setMobileOpen] = useState(false);

   const openMobile = useCallback(() => setMobileOpen(true), []);
   const closeMobile = useCallback(() => setMobileOpen(false), []);
   const toggleCollapsed = useCallback(() => setCollapsed((prev) => !prev), []);

   const value = useMemo<NSidebarContextValue>(
      () => ({
         collapsed,
         mobileOpen,
         openMobile,
         closeMobile,
         setCollapsed,
         toggleCollapsed,
         mobileBreakpoint,
      }),
      [collapsed, mobileOpen, openMobile, closeMobile, toggleCollapsed, mobileBreakpoint],
   );

   return <NSidebarContext.Provider value={value}>{children}</NSidebarContext.Provider>;
}
```

`NSidebar` must **use the context when present and fall back to its own state
when absent**, so every existing consumer keeps working unchanged. The sidebar is
a sibling of the content, so the provider has to wrap both — which is why this
cannot live inside `NSidebar` itself.

On the app side this replaces both `useState` calls in `DashboardShell`
(`mobileOpen` and, once 2.2 lands, `sidebarCollapsed`).

### Why context and not a zustand store

najm-kit already depends on zustand and uses it in `Dialog/store.ts` and
`table/store.ts`, so this is a deliberate choice, not an oversight:

- **`NSidebar` is already controlled** via `collapsed` / `mobileOpen` /
  `onCollapsedChange` / `onMobileOpenChange`. A consumer who wants zustand wires
  their own store into those props today. An internal store would become a second
  source of truth competing with the controlled API.
- **A module singleton is wrong in a library.** `apps/web`'s `useOrderCartStore`
  is a top-level `create(...)`, which is correct for one cart in one app. In the
  kit it would mean two `NSidebar`s on a page share `collapsed`, and a
  module-level store is shared across requests on the Next.js server.
- **The perf case is thin.** Context re-renders consumers, not the subtree, and
  the consumers here are one `NPageHeader` per page plus the logo render prop.

If you do want a store, follow the `NTable` precedent — `createSidebarStore()`
**per instance**, handed through this same context
([`NTable.tsx:592`](../najm/packages/najm-kit/src/components/table/NTable.tsx#L592))
— never a module singleton.

In `NPageHeader`, default the two props from context:

```tsx
const sidebar = useNSidebar();
const resolvedOnSidebarOpen = onSidebarOpen ?? sidebar?.openMobile;
const resolvedBreakpoint = mobileBreakpoint ?? sidebar?.mobileBreakpoint ?? "md";
```

Export `NSidebarProvider`, `useNSidebar`, and `NSidebarContextValue` from
`src/components/sidebar/index.ts`.

## 2.2 `logo` as a render prop

The logo block ([index.tsx:214-238](apps/web/src/shared/DashboardShell/index.tsx#L214-L238))
re-derives collapsed state in CSS (`lg:hidden xl:block` plus a `sidebarCollapsed`
ternary) because the kit will not tell it. The kit knows exactly — it computes
`desktopCollapsed = collapsed || autoCollapsed` and already passes
`collapsed={false}` to the mobile drawer. The render prop is **more correct than
the CSS approximation**, and it removes the app's `sidebarCollapsed` state.

In `types.ts`:

```ts
export type SidebarLogoRender = (state: {
   collapsed: boolean;
   isMobile: boolean;
}) => ReactNode;

logo?: ReactNode | SidebarLogoRender;
```

In `NSidebar.tsx`, replace lines 251–252:

```tsx
const renderLogo = (isMobile: boolean) =>
   typeof logo === "function"
      ? logo({ collapsed: isMobile ? false : desktopCollapsed, isMobile })
      : logo;

const desktopHeaderContent = renderLogo(false) ?? desktopDefaultLogoContent;
const mobileHeaderContent = renderLogo(true) ?? mobileDefaultLogoContent;
```

Consumer side:

```tsx
logo={({ collapsed }) =>
   collapsed ? (
      <BrandingImage slot="sidebarLogoCollapsed" ... />
   ) : (
      <BrandingImage slot="sidebarLogoExpanded" ... />
   )
}
```

⚠️ This is the change that breaks
[`branding-consumers.test.ts:12-19`](apps/web/test/branding-consumers.test.ts#L12-L19).
Update it in the same commit: drop the `sidebarCollapsed` /
`onCollapsedChange={setSidebarCollapsed}` assertions, keep the `slot=` and
`branding.*Path` ones.

## 2.3 Footer actions

The kit already has a stunted version of this: `onSettings` / `onLogout` /
`settingsLabel` / `logoutLabel` in
[`NSidebarFooter.tsx`](../najm/packages/najm-kit/src/components/sidebar/NSidebarFooter.tsx)
— hardcoded to exactly two buttons. Generalize it:

```ts
export interface NSidebarAction {
   id: string;
   icon: ComponentType<{ className?: string }>;
   label: string;
   onSelect?: () => void;
   /** For actions that must be wrapped by a third-party control. */
   wrap?: (node: ReactNode) => ReactNode;
}

footerActions?: NSidebarAction[];
```

Render each with the kit's own collapsed state (`{!collapsed && <span>}`),
which removes the app's three copies of
`w-full justify-start gap-2 lg:justify-center lg:px-0 xl:justify-start xl:px-3`
and `<span className="lg:hidden xl:inline">`. Keep `onSettings` / `onLogout`
working by mapping them onto the array internally — do not break other consumers.

The Phase 1 `footerActions` array is deliberately shaped to match this, so
adopting it is a rename (`onClick` → `onSelect`) plus deleting `SidebarAction`.

---

# Phase 3 — optional kit polish

- **`section` ids in the kit.** Let `NavItem` carry `section: string` and
  `NSidebar` take `sections: Record<string, { label, icon }>`, with `buildGroups`
  doing run detection. Replaces the fragile "the heading lives on the first item"
  contract and deletes `resolveSection` from the app.
- **`hidden?: boolean` on `NavItem`**, filtered before `buildGroups`, so
  consumers stop writing `...(cond ? [item] : [])`.
- **`activeMatch?: "exact" | "prefix"`.** `defaultIsActive` in
  [`NSidebarItem.tsx:6-10`](../najm/packages/najm-kit/src/components/sidebar/NSidebarItem.tsx#L6-L10)
  is exact-match only; prefix is the common case and deletes
  `isDashboardNavigationActive` from the app. Default to `"exact"` for
  compatibility.
- **A `labels` bundle** on `NSidebar` instead of four separate label props.
- **`NAppShell` without a navbar.** Kafil's outer `div` + `NajmScroll` is a
  hand-rolled `NAppShell`; it is not used only because `NAppShell` forces
  `NNavbar`. Blocked by the `phase7` source assertion — update that test if you
  take this on.

---

# Verification

```bash
bun run lint && bun run typecheck && bun run test && bun run build && bun run db:generate
```

`db:generate` must produce **no** new migration — this is a frontend-only change.
If it does, stop and investigate schema drift.

Then check the rendered app rather than trusting the gate alone:

- All four roles: sidebar order and section headings match the table in 1.1.
- Collapsed rail (1024–1279px) and expanded (≥1280px): logo swaps correctly.
- Mobile drawer opens from every page header — this is what Phase 2.1 rewires.
- `ar` locale: RTL layout intact and the collapse/expand tooltips are Arabic.
