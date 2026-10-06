import { LucideIcon } from "lucide-react";

export type UserRole = "student" | "teacher" | "admin" | "guest";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeVariant?: "default" | "primary" | "warning" | "success";
  external?: boolean;
  disabled?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface RoleNavConfig {
  role: UserRole;
  sections: NavSection[];
}
