"use client";

import { SignOutButton } from "najm-auth/client/react";
import { LogOut, Settings2, UserRound } from "lucide-react";
import { NButton, NajmScroll, NSidebar, NSidebarProvider, useNSidebar } from "najm-kit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import {
   AdminThemeSettingsSheets,
   AppSettingsSheet,
   canOpenAppSettings,
   type SettingsSheetKind,
} from "@/features/Settings/components/SettingsSheets";
import { OrderCartOverlay } from "@/features/OrderCart";
import { openSponsorProfileSheet, SponsorProfileSheet, } from "@/features/Sponsors/components/profile/SponsorProfileSheet";
import { KafilRoleProvider } from "@/shared/Authorization";
import {
   BRANDING_SETTINGS_NAV_ID,
   getDashboardNavigation,
   isDashboardNavigationActive,
   THEME_SETTINGS_NAV_ID,
   translateDashboardNavigation,
} from "./navigation";
export {
   BRANDING_SETTINGS_NAV_ID,
   getDashboardNavigation,
   isDashboardNavigationActive,
   THEME_SETTINGS_NAV_ID,
   translateDashboardNavigation,
} from "./navigation";
export type { DashboardRole } from "./navigation";

interface DashboardUser {
   email: string;
   name?: string | null;
   role?: string | null;
}

const SIDEBAR_ACTION_CLASS = "w-full justify-start gap-2 lg:justify-center lg:px-0 xl:justify-start xl:px-3";

function SidebarAction({ icon: Icon, label, onClick }: Readonly<{ icon: ComponentType<{ className?: string }>; label: string; onClick?: () => void; }>) {
   return (
      <NButton className={SIDEBAR_ACTION_CLASS} size="sm" variant="ghost" onClick={onClick}>
         <Icon className="size-4" />
         <span className="lg:hidden xl:inline">{label}</span>
      </NButton>
   );
}

function DashboardShellBody({ children, user }: Readonly<{ children: React.ReactNode; user: DashboardUser }>) {
   const pathname = usePathname();
   const { t } = useKafilLanguage();
   const sidebar = useNSidebar();
   const navItems = useMemo(() => translateDashboardNavigation(getDashboardNavigation(user.role), t), [t, user.role],);
   const [activeSettingsSheet, setActiveSettingsSheet] = useState<SettingsSheetKind | null>(null);
   const closeMobile = () => sidebar?.closeMobile();

   function openSettingsSheet(sheet: SettingsSheetKind) {
      closeMobile();
      setActiveSettingsSheet(sheet);
   }

   const footerActions = [
      {
         id: "profile",
         icon: UserRound,
         label: t("sponsor.profile.open"),
         show: user.role === "sponsor",
         onClick: () => {
            closeMobile();
            openSponsorProfileSheet();
         },
      },
      {
         id: "settings",
         icon: Settings2,
         label: t("nav.settings"),
         show: canOpenAppSettings(user.role),
         onClick: () => {
            openSettingsSheet("app");
         },
      },
      {
         id: "signOut",
         icon: LogOut,
         label: t("action.signOut"),
         show: true,
         wrap: (node: ReactNode) => (
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

   return (
      <>
         <div className="flex h-screen w-full overflow-hidden bg-background ">
            <NSidebar
               navItems={navItems}
               activePath={pathname}
               isActive={isDashboardNavigationActive}
               onNavigate={(target) => {
                  if (target === THEME_SETTINGS_NAV_ID) openSettingsSheet("theme");
                  if (target === BRANDING_SETTINGS_NAV_ID) openSettingsSheet("branding");
               }}
               linkComponent={Link}
               autoCollapseAt="lg"
               showHamburgerButton={false}
               hamburgerLabel={t("sidebar.open")}
               closeLabel={t("sidebar.close")}
               collapseLabel={t("sidebar.collapse")}
               expandLabel={t("sidebar.expand")}
               footer={
                  <div className="space-y-1">
                     {footerActions.map(({ id, icon, label, onClick, wrap }) => {
                        const button = (
                           <SidebarAction icon={icon} label={label} onClick={onClick} />
                        );
                        return <Fragment key={id}>{wrap ? wrap(button) : button}</Fragment>;
                     })}
                  </div>
               }
            />

            <div className="flex h-full min-h-0 w-full flex-col">
               <NajmScroll axis="y" className="min-h-0 flex-1">
                  {children}
               </NajmScroll>
            </div>
         </div>
         {pathname !== "/settings" ? (
            <AppSettingsSheet
               open={activeSettingsSheet === "app"}
               onOpenChange={(open) => setActiveSettingsSheet(open ? "app" : null)}
               role={user.role}
            />
         ) : null}
         <AdminThemeSettingsSheets
            activeSheet={activeSettingsSheet}
            onActiveSheetChange={setActiveSettingsSheet}
            role={user.role}
         />
         {user.role === "sponsor" ? <SponsorProfileSheet /> : null}
         <OrderCartOverlay />
      </>
   );
}

export function DashboardShell({ children, user, }: Readonly<{ children: React.ReactNode; user: DashboardUser }>) {
   return (
      <KafilRoleProvider role={user.role}>
         <NSidebarProvider mobileBreakpoint="lg">
            <DashboardShellBody user={user}>{children}</DashboardShellBody>
         </NSidebarProvider>
      </KafilRoleProvider>
   );
}
