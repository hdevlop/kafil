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
    * form covers the rows that sit in different sections per role (a role left
    * out of the record inherits whichever section is already open).
    */
   section?: SectionId | Partial<Record<DashboardRole, SectionId>>;
}

/**
 * One table, in render order. Filtering by role reproduces every per-role
 * ordering the four builders used to hand-write, which is why the order below
 * must not be shuffled.
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
 * not translated strings. `translateDashboardNavigation` applies `t` once at the
 * edge; keeping this function pure is what lets tests assert on it without a
 * stand-in translator.
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
