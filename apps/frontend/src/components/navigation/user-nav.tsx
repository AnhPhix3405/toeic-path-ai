"use client";

import * as React from "react";
import Link from "next/link";
import { User, Settings, LogOut, Shield, ChevronDown, Check } from "lucide-react";
import { UserRole } from "@/types/navigation";
import { cn } from "@/lib/utils";

interface UserNavProps {
  user?: {
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
  };
}

export function UserNav({
  user = {
    name: "Nguyễn Văn A",
    email: "student@toeicpath.ai",
    role: "student",
  },
}: UserNavProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const roleLabel = {
    student: "Học viên",
    teacher: "Giảng viên",
    admin: "Quản trị viên",
    guest: "Khách",
  }[user.role];

  const roleBadgeStyle = {
    student: "bg-primary/10 text-primary border-primary/20",
    teacher: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    admin: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    guest: "bg-muted text-muted-foreground border-border",
  }[user.role];

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full p-1 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
        aria-label="Mở menu người dùng"
        aria-expanded={isOpen}
        type="button"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
          {initials}
        </div>
        <div className="hidden text-left sm:block pr-1">
          <p className="text-xs font-semibold leading-tight text-foreground">{user.name}</p>
          <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
        </div>
        <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-card p-1.5 text-card-foreground shadow-xl animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="px-2 py-2 border-b border-border/60">
            <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            <span
              className={cn(
                "mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                roleBadgeStyle
              )}
            >
              {roleLabel}
            </span>
          </div>

          {/* Quick Menu Items */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
              role="menuitem"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Hồ sơ cá nhân</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
              role="menuitem"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Cài đặt tài khoản</span>
            </Link>
          </div>

          {/* Switch Role Preview Quick Links */}
          <div className="border-t border-border/60 py-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Chuyển không gian
            </div>
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-accent text-foreground transition-colors"
              role="menuitem"
            >
              <span>Học viên (Student)</span>
              {user.role === "student" && <Check className="h-3.5 w-3.5 text-primary" />}
            </Link>
            <Link
              href="/teacher-dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-accent text-foreground transition-colors"
              role="menuitem"
            >
              <span>Giảng viên (Teacher)</span>
              {user.role === "teacher" && <Check className="h-3.5 w-3.5 text-primary" />}
            </Link>
            <Link
              href="/admin-dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-accent text-foreground transition-colors"
              role="menuitem"
            >
              <span>Quản trị viên (Admin)</span>
              {user.role === "admin" && <Check className="h-3.5 w-3.5 text-primary" />}
            </Link>
          </div>

          {/* Logout Button */}
          <div className="border-t border-border/60 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                // Handle logout in Sprint 2
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              role="menuitem"
              type="button"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
