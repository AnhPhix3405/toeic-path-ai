import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata = {
  title: "Quên mật khẩu | TOEIC Path AI",
  description: "Yêu cầu liên kết đặt lại mật khẩu tài khoản học viên TOEIC Path AI",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AuthCard
        title="Quên mật khẩu?"
        description="Nhập email đã đăng ký để nhận liên kết khôi phục mật khẩu tài khoản"
        switchText="Nhớ lại mật khẩu?"
        switchActionText="Đăng nhập ngay"
        switchHref="/login"
      >
        <ForgotPasswordForm />
      </AuthCard>
    </div>
  );
}
