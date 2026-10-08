import * as React from "react";
import { Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata = {
  title: "Đặt lại mật khẩu | TOEIC Path AI",
  description: "Thiết lập mật khẩu mới an toàn cho tài khoản học viên TOEIC Path AI",
};

function ResetPasswordFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Đang xác thực liên kết...</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AuthCard
        title="Đặt lại mật khẩu mới"
        description="Nhập mật khẩu mới an toàn gồm tối thiểu 12 ký tự cho tài khoản của bạn"
        switchText="Đã nhớ lại mật khẩu?"
        switchActionText="Đăng nhập ngay"
        switchHref="/login"
      >
        <React.Suspense fallback={<ResetPasswordFallback />}>
          <ResetPasswordForm />
        </React.Suspense>
      </AuthCard>
    </div>
  );
}
