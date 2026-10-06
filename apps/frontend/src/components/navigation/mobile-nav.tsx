"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Sparkles, LucideIcon } from "lucide-react";
import { getNavSectionsForRole } from "@/config/navigation";
import { UserRole } from "@/types/navigation";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
}

export function MobileNav({ isOpen, onClose, role }: MobileNavProps) {
  const pathname = usePathname();
  const sections = getNavSectionsForRole(role);

  // Lock body scroll and listen for Escape
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const roleTitle = {
    student: "Học viên",
    teacher: "Giảng viên",
    admin: "Quản trị viên",
    guest: "Khách",
  }[role];

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-card text-card-foreground shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5 font-bold tracking-tight"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold leading-tight">TOEIC Path AI</span>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                {roleTitle}
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
            aria-label="Đóng menu"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {sections.map((section, sIdx) => (
            <div key={section.title || sIdx} className="space-y-1">
              {section.title && (
                <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  {section.title}
                </h3>
              )}
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));
                  const Icon: LucideIcon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        <span>{item.title}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            item.badgeVariant === "primary" && "bg-primary text-primary-foreground",
                            item.badgeVariant === "warning" && "bg-warning text-warning-foreground",
                            (!item.badgeVariant || item.badgeVariant === "default") &&
                              "bg-muted text-muted-foreground"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Role Info */}
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Vai trò:</span>
            <span className="font-semibold text-foreground">{roleTitle}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
