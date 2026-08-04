"use client";

import { SignOutButton } from "najm-auth/client/react";
import {
  Baby,
  ClipboardCheck,
  ClipboardList,
  HandCoins,
  HeartHandshake,
  House,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Tags,
  UserRound,
  UsersRound,
} from "lucide-react";
import { NButton, NajmScroll, NSidebar, type NavItem } from "najm-kit";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { BrandingImage } from "@/features/Branding";
import {
  canOpenGlobalSettings,
  GlobalSettingsSheet,
} from "@/features/Settings/components/GlobalSettingsSheet";
import { useKafilBranding } from "@/providers/KafilBrandingProvider";
import { OrderCartOverlay } from "@/features/OrderCart";
import {
  openSponsorProfileSheet,
  SponsorProfileSheet,
} from "@/features/Sponsors/components/profile/SponsorProfileSheet";
import { KafilRoleProvider } from "@/shared/Authorization";
import { UserShieldIcon } from "@/shared/icons/UserShieldIcon";
import { DashboardSidebarProvider } from "./DashboardPageHeader";

interface DashboardUser {
  email: string;
  name?: string | null;
  role?: string | null;
}

function operatorItems(
  t: ReturnType<typeof useKafilLanguage>["t"],
  includeStaff = false,
  includeApplicants = false,
): NavItem[] {
  return [
    { id: "/dashboard", href: "/dashboard", label: t("nav.overview"), icon: LayoutDashboard },
    {
      id: "/family",
      href: "/family",
      label: t("nav.families"),
      icon: UsersRound,
      sectionLabel: t("nav.supportOperations"),
      sectionIcon: HeartHandshake,
    },
    { id: "/children", href: "/children", label: t("nav.children"), icon: Baby },
    { id: "/operator/sponsors", href: "/operator/sponsors", label: t("nav.sponsors"), icon: UserRound },
    ...(includeStaff
      ? [{
          id: "/operator/staff",
          href: "/operator/staff",
          label: t("nav.staff"),
          icon: UserShieldIcon,
        }]
      : []),
    { id: "/operator/assignments", href: "/operator/assignments", label: t("nav.assignments"), icon: HeartHandshake },
    ...(includeApplicants
      ? [{ id: "/applicants", href: "/applicants", label: t("nav.applicants"), icon: ClipboardList }]
      : []),
    {
      id: "/contribution",
      href: "/contribution",
      label: t("nav.contributions"),
      icon: HandCoins,
      sectionLabel: t("nav.finance"),
      sectionIcon: HandCoins,
    },
    {
      id: "/categories",
      href: "/categories",
      label: t("nav.categories"),
      icon: Tags,
      sectionLabel: t("nav.catalogOperations"),
      sectionIcon: PackageSearch,
    },
    { id: "/products", href: "/products", label: t("nav.products"), icon: ShoppingBag },
    { id: "/orders", href: "/orders", label: t("nav.orders"), icon: ClipboardCheck },
  ];
}

function adminAccessItems(
  t: ReturnType<typeof useKafilLanguage>["t"],
): NavItem[] {
  return [
    {
      id: "/operator/access/users",
      href: "/operator/access/users",
      label: t("nav.users"),
      icon: UsersRound,
      sectionLabel: t("nav.accessManagement"),
      sectionIcon: ShieldCheck,
    },
    {
      id: "/operator/access/roles",
      href: "/operator/access/roles",
      label: t("nav.roles"),
      icon: ShieldCheck,
    },
    {
      id: "/operator/access/permissions",
      href: "/operator/access/permissions",
      label: t("nav.permissions"),
      icon: KeyRound,
    },
  ];
}

function familyItems(t: ReturnType<typeof useKafilLanguage>["t"]): NavItem[] {
  return [
    { id: "/dashboard", href: "/dashboard", label: t("nav.overview"), icon: LayoutDashboard },
    {
      id: "/children",
      href: "/children",
      label: t("nav.children"),
      icon: Baby,
      sectionLabel: t("nav.household"),
      sectionIcon: House,
    },
    {
      id: "/contribution",
      href: "/contribution",
      label: t("nav.contributions"),
      icon: HandCoins,
      sectionLabel: t("nav.finance"),
      sectionIcon: HandCoins,
    },
    {
      id: "/categories",
      href: "/categories",
      label: t("nav.categories"),
      icon: Tags,
      sectionLabel: t("nav.catalogOperations"),
      sectionIcon: PackageSearch,
    },
    {
      id: "/products",
      href: "/products",
      label: t("nav.products"),
      icon: ShoppingBag,
    },
    { id: "/orders", href: "/orders", label: t("nav.orders"), icon: ClipboardCheck },
  ];
}

function sponsorItems(t: ReturnType<typeof useKafilLanguage>["t"]): NavItem[] {
  return [
    { id: "/dashboard", href: "/dashboard", label: t("nav.overview"), icon: LayoutDashboard },
    {
      id: "/family",
      href: "/family",
      label: t("nav.families"),
      icon: UsersRound,
      sectionLabel: t("nav.supportAndFinance"),
      sectionIcon: HeartHandshake,
    },
    { id: "/contribution", href: "/contribution", label: t("nav.contributions"), icon: HandCoins },
    { id: "/orders", href: "/orders", label: t("nav.orders"), icon: ClipboardCheck },
  ];
}

function LinkAdapter({
  children,
  className,
  href,
  onClick,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  href: string;
  onClick?: React.MouseEventHandler;
}>) {
  return (
    <a className={className} href={href} onClick={onClick}>
      {children}
    </a>
  );
}

export function getDashboardNavigation(
  role: string | null | undefined,
  t: ReturnType<typeof useKafilLanguage>["t"],
) {
  if (role === "admin") return [...operatorItems(t, true, true), ...adminAccessItems(t)];
  if (role === "operator") return operatorItems(t);
  if (role === "family") return familyItems(t);
  if (role === "sponsor") return sponsorItems(t);
  return [];
}

export function isDashboardNavigationActive(item: NavItem, pathname: string) {
  if (!item.href) return false;
  if (item.href === "/dashboard") return pathname === "/dashboard";
  if (item.href === "/products") {
    if (pathname === "/products") return true;
    if (pathname.startsWith("/products/")) return true;
    if (pathname === "/family/catalog" || pathname === "/family/cart") {
      return true;
    }
    return false;
  }
  if (item.href === "/family") {
    return pathname === "/family";
  }
  if (item.href === "/children") {
    return pathname === "/children";
  }
  if (item.href === "/categories") {
    return pathname === "/categories" || pathname.startsWith("/categories/");
  }
  if (item.href === "/orders") {
    if (pathname === "/orders") return true;
    if (pathname.startsWith("/orders/")) return true;
    return false;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function DashboardShell({
  children,
  user,
}: Readonly<{ children: React.ReactNode; user: DashboardUser }>) {
  const pathname = usePathname();
  const { t } = useKafilLanguage();
  const { resolved: branding } = useKafilBranding();
  const navItems = getDashboardNavigation(user.role, t);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <KafilRoleProvider role={user.role}>
      <DashboardSidebarProvider openSidebar={() => setMobileOpen(true)}>
        <div className="flex h-screen w-full overflow-hidden bg-background ">
        <NSidebar
          logo={
            <>
              <BrandingImage
                slot="sidebarLogoExpanded"
                alt="Kafil platform"
                className={`mx-auto h-10 w-32 object-contain lg:hidden${
                  sidebarCollapsed ? "" : " xl:block"
                }`}
                height={233}
                preload
                src={branding.sidebarLogoExpandedPath}
                width={701}
              />
              <span
                className={`hidden size-8 overflow-hidden rounded-lg lg:block${
                  sidebarCollapsed ? "" : " xl:hidden"
                }`}
              >
                <BrandingImage
                  slot="sidebarLogoCollapsed"
                  alt=""
                  aria-hidden="true"
                  className="size-full object-contain object-center"
                  height={233}
                  src={branding.sidebarLogoCollapsedPath}
                  width={233}
                />
              </span>
            </>
          }
          navItems={navItems}
          activePath={pathname}
          isActive={isDashboardNavigationActive}
          linkComponent={LinkAdapter}
          mobileBreakpoint="lg"
          autoCollapseAt="lg"
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
          onCollapsedChange={setSidebarCollapsed}
          showHamburgerButton={false}
          footer={
            <div className="space-y-1">
              {user.role === "sponsor" ? (
                <NButton
                  className="w-full justify-start gap-2 lg:justify-center lg:px-0 xl:justify-start xl:px-3"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMobileOpen(false);
                    openSponsorProfileSheet();
                  }}
                >
                  <UserRound className="size-4" />
                  <span className="lg:hidden xl:inline">{t("sponsor.profile.open")}</span>
                </NButton>
              ) : null}
              {canOpenGlobalSettings(user.role) ? (
                <NButton
                  className="w-full justify-start gap-2 lg:justify-center lg:px-0 xl:justify-start xl:px-3"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMobileOpen(false);
                    setSettingsOpen(true);
                  }}
                >
                  <Settings2 className="size-4" />
                  <span className="lg:hidden xl:inline">{t("nav.settings")}</span>
                </NButton>
              ) : null}
              <SignOutButton
                onSuccess={() => {
                  window.location.replace("/login");
                }}
              >
                <NButton
                  className="w-full justify-start gap-2 lg:justify-center lg:px-0 xl:justify-start xl:px-3"
                  size="sm"
                  variant="ghost"
                >
                  <LogOut className="size-4" />
                  <span className="lg:hidden xl:inline">{t("action.signOut")}</span>
                </NButton>
              </SignOutButton>
            </div>
          }
        />

        <div className="flex h-full min-h-0 w-full flex-col">
          <NajmScroll axis="y" className="min-h-0 flex-1">
            {children}
          </NajmScroll>
        </div>
        </div>
        {pathname !== "/operator/settings" ? (
          <GlobalSettingsSheet
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            role={user.role}
          />
        ) : null}
        {user.role === "sponsor" ? <SponsorProfileSheet /> : null}
        <OrderCartOverlay />
      </DashboardSidebarProvider>
    </KafilRoleProvider>
  );
}
