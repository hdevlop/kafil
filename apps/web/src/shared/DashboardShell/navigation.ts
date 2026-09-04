import {  Baby,  ClipboardCheck,  ClipboardList,  HandCoins,
   HeartHandshake,
   House,
   KeyRound,
   LayoutDashboard,
   PackageSearch,
   Palette,
   ImageIcon,
   ShieldCheck,
   ShoppingBag,
   Settings2,
   Tags,
   UserRound,
   UsersRound,
} from "lucide-react";
import type { NavItem } from "najm-kit";
import type { ComponentType } from "react";

import type { UiTranslationKey } from "@kafil/server/locales";
import { UserShieldIcon } from "@/shared/icons/UserShieldIcon";

export type DashboardRole = "admin" | "operator" | "family" | "sponsor";

type NavIcon = ComponentType<{ className?: string }>;

const ALL_ROLES = ["admin", "operator", "family", "sponsor"] as const;

const NAV_SECTIONS = {
   support: { labelKey: "nav.supportOperations", icon: HeartHandshake },
   household: { labelKey: "nav.household", icon: House },
   finance: { labelKey: "nav.finance", icon: HandCoins },
   catalog: { labelKey: "nav.catalogOperations", icon: PackageSearch },
   access: { labelKey: "nav.accessManagement", icon: ShieldCheck },
   theme: { labelKey: "nav.theme", icon: Palette },
   settings: { labelKey: "nav.settings", icon: Settings2 },
   sponsorAll: { labelKey: "nav.supportAndFinance", icon: HeartHandshake },
} satisfies Record<string, { labelKey: UiTranslationKey; icon: NavIcon }>;

type SectionId = keyof typeof NAV_SECTIONS;

export const THEME_SETTINGS_NAV_ID = "settings:theme";
export const BRANDING_SETTINGS_NAV_ID = "settings:branding";
export const ACCESS_NAV_GROUP_ID = "navigation:access";
export const THEME_NAV_GROUP_ID = "navigation:theme";

interface DashboardNavRow {
   href: string;
   labelKey: UiTranslationKey;
   icon: NavIcon;
   roles: readonly DashboardRole[];
   section?: SectionId | Partial<Record<DashboardRole, SectionId>>;
}


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
      href: "/assignments",
      labelKey: "nav.assignments",
      icon: HeartHandshake,
      roles: ["admin", "operator"],
      section: "finance",
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

   if (role === "admin") {
      const accessStart = items.findIndex((item) => item.href === "/users");
      const accessChildren = items.splice(accessStart).map((item) => ({
         ...item,
         sectionLabel: undefined,
         sectionIcon: undefined,
      }));

      items.push(
         {
            id: ACCESS_NAV_GROUP_ID,
            icon: NAV_SECTIONS.access.icon,
            label: NAV_SECTIONS.access.labelKey,
            sectionLabel: NAV_SECTIONS.settings.labelKey,
            sectionIcon: NAV_SECTIONS.settings.icon,
            children: accessChildren,
         },
         {
            id: THEME_NAV_GROUP_ID,
            icon: NAV_SECTIONS.theme.icon,
            label: NAV_SECTIONS.theme.labelKey,
            children: [
               {
                  id: THEME_SETTINGS_NAV_ID,
                  icon: Palette,
                  label: "nav.theme",
               },
               {
                  id: BRANDING_SETTINGS_NAV_ID,
                  icon: ImageIcon,
                  label: "nav.branding",
               },
            ],
         },
      );
   }

   return items;
}


export function translateDashboardNavigation(
   items: NavItem[],
   t: (key: UiTranslationKey) => string,
): NavItem[] {
   return items.map((item) => ({
      ...item,
      label: t(item.label as UiTranslationKey),
      ...(item.children
         ? { children: translateDashboardNavigation(item.children, t) }
         : {}),
      ...(item.sectionLabel
         ? { sectionLabel: t(item.sectionLabel as UiTranslationKey) }
         : {}),
   }));
}

export function isDashboardNavigationActive(item: NavItem, pathname: string) {
   if (!item.href) return false;
   return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
