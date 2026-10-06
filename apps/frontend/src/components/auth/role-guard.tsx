"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { UnauthorizedView } from "@/components/feedback/unauthorized-view";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserRole } from "@/types/api";

export interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUnauthorizedScreen?: boolean;
}

export function RoleGuard({
  allowedRoles,
  children,
  fallback,
  showUnauthorizedScreen = true,
}: RoleGuardProps) {
  const { role, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 w-full animate-pulse" data-testid="role-guard-loading">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  const isAuthorized = isAuthenticated && role && allowedRoles.includes(role);

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUnauthorizedScreen) {
      if (!isAuthenticated) {
        return (
          <UnauthorizedView
            title="Yêu cầu đăng nhập"
            description="Bạn cần đăng nhập bằng tài khoản có thẩm quyền để sử dụng tính năng này."
            loginHref="/login"
          />
        );
      }

      return (
        <UnauthorizedView
          title="Không đủ quyền truy cập"
          description={`Khu vực này yêu cầu vai trò: ${allowedRoles.join(" hoặc ")}. Tài khoản hiện tại của bạn là ${role}.`}
        />
      );
    }

    return null;
  }

  return <>{children}</>;
}
