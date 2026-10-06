import type { Metadata } from "next";
import { UnauthorizedView } from "@/components/feedback/unauthorized-view";

export const metadata: Metadata = {
  title: "Truy cập bị từ chối — TOEIC Path AI",
  description: "Bạn không có quyền truy cập vào tài nguyên này.",
};

export default function UnauthorizedPage() {
  return (
    <main className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <UnauthorizedView
        title="403 — Không có quyền truy cập"
        description="Tài khoản hiện tại của bạn không được phân quyền để truy cập trang này. Vui lòng liên hệ Quản trị viên hoặc đăng nhập lại bằng tài khoản phù hợp."
        backHref="/"
        loginHref="/login"
      />
    </main>
  );
}
