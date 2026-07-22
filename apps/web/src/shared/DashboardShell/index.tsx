"use client";

import { SignOutButton } from "najm-auth/client/react";
import {
  Baby,
  ClipboardCheck,
  HandCoins,
  HeartHandshake,
  House,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Tags,
  UserRound,
  UsersRound,
  WalletCards,
  Warehouse,
} from "lucide-react";
import { NButton, NSidebar, type NavItem } from "najm-kit";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { DashboardSidebarProvider } from "./DashboardPageHeader";

interface DashboardUser {
  email: string;
  name?: string | null;
  role?: string | null;
}

function operatorItems(t: ReturnType<typeof useKafilLanguage>["t"]): NavItem[] {
  return [
    { id: "/operator", href: "/operator", label: t("nav.overview"), icon: LayoutDashboard },
    {
      id: "/operator/families",
      href: "/operator/families",
      label: t("nav.families"),
      icon: UsersRound,
      sectionLabel: t("nav.supportOperations"),
      sectionIcon: HeartHandshake,
    },
    { id: "/operator/children", href: "/operator/children", label: t("nav.children"), icon: Baby },
    { id: "/operator/sponsors", href: "/operator/sponsors", label: t("nav.sponsors"), icon: UserRound },
    { id: "/operator/assignments", href: "/operator/assignments", label: t("nav.assignments"), icon: HeartHandshake },
    {
      id: "/operator/contributions",
      href: "/operator/contributions",
      label: t("nav.contributions"),
      icon: HandCoins,
      sectionLabel: t("nav.finance"),
      sectionIcon: HandCoins,
    },
    { id: "/operator/budgets", href: "/operator/budgets", label: t("nav.budgets"), icon: WalletCards },
    {
      id: "/operator/categories",
      href: "/operator/categories",
      label: t("nav.categories"),
      icon: Tags,
      sectionLabel: t("nav.catalogOperations"),
      sectionIcon: PackageSearch,
    },
    { id: "/operator/products", href: "/operator/products", label: t("nav.products"), icon: ShoppingBag },
    { id: "/operator/inventory", href: "/operator/inventory", label: t("nav.inventory"), icon: Warehouse },
    { id: "/operator/orders", href: "/operator/orders", label: t("nav.orders"), icon: ClipboardCheck },
    {
      id: "/operator/settings",
      href: "/operator/settings",
      label: t("nav.settings"),
      icon: Settings2,
      sectionLabel: t("nav.platform"),
      sectionIcon: Settings2,
    },
  ];
}

function familyItems(t: ReturnType<typeof useKafilLanguage>["t"]): NavItem[] {
  return [
    { id: "/family", href: "/family", label: t("nav.overview"), icon: LayoutDashboard },
    {
      id: "/family/children",
      href: "/family/children",
      label: t("nav.children"),
      icon: Baby,
      sectionLabel: t("nav.household"),
      sectionIcon: House,
    },
    { id: "/family/budget", href: "/family/budget", label: t("nav.budgets"), icon: WalletCards },
    {
      id: "/family/catalog",
      href: "/family/catalog",
      label: t("nav.catalog"),
      icon: PackageSearch,
      sectionLabel: t("nav.shopping"),
      sectionIcon: ShoppingBag,
    },
    { id: "/family/cart", href: "/family/cart", label: t("nav.cart"), icon: ShoppingCart },
    { id: "/family/orders", href: "/family/orders", label: t("nav.orders"), icon: ClipboardCheck },
  ];
}

function sponsorItems(t: ReturnType<typeof useKafilLanguage>["t"]): NavItem[] {
  return [
    { id: "/sponsor", href: "/sponsor", label: t("nav.overview"), icon: LayoutDashboard },
    {
      id: "/sponsor/support",
      href: "/sponsor/support",
      label: t("nav.mySupport"),
      icon: UsersRound,
      sectionLabel: t("nav.supportAndFinance"),
      sectionIcon: HeartHandshake,
    },
    { id: "/sponsor/contributions", href: "/sponsor/contributions", label: t("nav.contributions"), icon: HandCoins },
    { id: "/sponsor/budgets", href: "/sponsor/budgets", label: t("nav.budgetUse"), icon: WalletCards },
    { id: "/sponsor/orders", href: "/sponsor/orders", label: t("nav.orders"), icon: ClipboardCheck },
    {
      id: "/sponsor/profile",
      href: "/sponsor/profile",
      label: t("nav.profile"),
      icon: UserRound,
      sectionLabel: t("nav.account"),
      sectionIcon: Settings2,
    },
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
    <Link className={className} href={href} onClick={onClick} prefetch={false}>
      {children}
    </Link>
  );
}

export function getDashboardNavigation(role: string | null | undefined, t: ReturnType<typeof useKafilLanguage>["t"]) {
  if (role === "admin" || role === "operator") return operatorItems(t);
  if (role === "family") return familyItems(t);
  if (role === "sponsor") return sponsorItems(t);
  return [];
}

export function isDashboardNavigationActive(item: NavItem, pathname: string) {
  if (!item.href) return false;
  if (["/operator", "/family", "/sponsor"].includes(item.href)) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function DashboardShell({
  children,
  user,
}: Readonly<{ children: React.ReactNode; user: DashboardUser }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useKafilLanguage();
  const navItems = getDashboardNavigation(user.role, t);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <DashboardSidebarProvider openSidebar={() => setMobileOpen(true)}>
      <div className="flex h-screen w-full overflow-hidden bg-background ">
        <NSidebar
          logo={
            <>
              <Image
                alt="Kafil"
                className="mx-auto h-auto w-32 lg:hidden xl:block"
                height={233}
                priority
                src="/logoExpanded.png"
                width={701}
              />
              <span className="hidden size-8 overflow-hidden rounded-lg lg:block xl:hidden">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="size-full object-cover object-center"
                  height={233}
                  src="/logoExpanded.png"
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
          showHamburgerButton={false}
          footer={
            <div className="border-t border-sidebar-border px-1 pt-3">
              <SignOutButton
                onSuccess={() => {
                  router.replace("/login");
                  router.refresh();
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

        <div className="flex h-full min-h-0 w-full flex-col gap-2">
          {children}
        </div>
      </div>
    </DashboardSidebarProvider>
  );
}
