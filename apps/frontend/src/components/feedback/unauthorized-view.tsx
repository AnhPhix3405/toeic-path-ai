import * as React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UnauthorizedViewProps {
  title?: string;
  description?: string;
  backHref?: string;
  loginHref?: string;
  showLoginButton?: boolean;
}

export function UnauthorizedView({
  title = "Quyền truy cập bị từ chối",
  description = "Bạn không có quyền hạn cần thiết để truy cập vào khu vực này hoặc phiên đăng nhập của bạn đã hết hạn.",
  backHref = "/dashboard",
  loginHref = "/login",
  showLoginButton = true,
}: UnauthorizedViewProps) {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center p-6 text-center animate-in fade-in-50 duration-200">
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-sm">
        <ShieldAlert className="h-10 w-10" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>

      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="outline" className="gap-2">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại trang chủ
          </Link>
        </Button>

        {showLoginButton && (
          <Button asChild className="gap-2">
            <Link href={loginHref}>
              <LogIn className="h-4 w-4" />
              Đăng nhập tài khoản khác
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
