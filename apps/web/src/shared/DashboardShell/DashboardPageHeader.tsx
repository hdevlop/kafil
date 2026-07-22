"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  NPageHeader as NajmPageHeader,
  type NPageHeaderProps,
} from "najm-kit";

const DashboardSidebarOpenContext = createContext<(() => void) | null>(null);

export function DashboardSidebarProvider({
  children,
  openSidebar,
}: Readonly<{
  children: ReactNode;
  openSidebar: () => void;
}>) {
  return (
    <DashboardSidebarOpenContext.Provider value={openSidebar}>
      {children}
    </DashboardSidebarOpenContext.Provider>
  );
}

export function DashboardPageHeader({
  mobileBreakpoint = "lg",
  onSidebarOpen,
  ...props
}: NPageHeaderProps) {
  const openSidebar = useContext(DashboardSidebarOpenContext);

  return (
    <NajmPageHeader
      {...props}
      mobileBreakpoint={mobileBreakpoint}
      onSidebarOpen={onSidebarOpen ?? openSidebar ?? undefined}
    />
  );
}
