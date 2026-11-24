"use client";

import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuthStore } from "@/stores/auth.store";
import { UserRole } from "@/types/navigation";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userRole = useAuthStore((s) => s.user?.role);
  const effectiveRole: UserRole =
    userRole === "teacher" || userRole === "admin" ? userRole : "student";

  return <AppLayout role={effectiveRole}>{children}</AppLayout>;
}
