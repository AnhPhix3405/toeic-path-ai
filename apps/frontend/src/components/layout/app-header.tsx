"use client";

import * as React from "react";
import { Menu, Search, Bell } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { UserNav } from "@/components/navigation/user-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserRole } from "@/types/navigation";

interface AppHeaderProps {
  role: UserRole;
  onOpenMobileNav: () => void;
}

export function AppHeader({ role, onOpenMobileNav }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 sm:px-6 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onOpenMobileNav}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors hover:bg-accent lg:hidden cursor-pointer"
          aria-label="Mở menu điều hướng"
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Breadcrumbs className="hidden sm:flex" />
      </div>

      {/* Right: Search / Actions / Theme / User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search Trigger */}
        <button
          className="hidden sm:inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Tìm kiếm nhanh"
          type="button"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Tìm kiếm...</span>
          <kbd className="pointer-events-none rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Notifications Icon Placeholder */}
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground relative"
          aria-label="Thông báo"
          type="button"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Navigation Dropdown */}
        <UserNav
          user={{
            name: role === "student" ? "Nguyễn Văn A" : role === "teacher" ? "Thầy Trần B" : "Admin Hệ Thống",
            email: `${role}@toeicpath.ai`,
            role,
          }}
        />
      </div>
    </header>
  );
}
