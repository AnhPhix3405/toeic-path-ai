"use client";

import * as React from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { UserRole } from "@/types/navigation";

interface AppLayoutProps {
  role: UserRole;
  children: React.ReactNode;
}

export function AppLayout({ role, children }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Sidebar (Fixed Left) */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64">
        <AppSidebar role={role} className="w-full" />
      </div>

      {/* Mobile Drawer */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        role={role}
      />

      {/* Main Content Area (Offset by 64 on Desktop) */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        <AppHeader
          role={role}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
