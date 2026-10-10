"use client";

import * as React from "react";
import { Shield, Bell, Moon, SlidersHorizontal } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuthStore } from "@/stores/auth.store";
import { SecuritySettings } from "@/features/settings/components/security-settings";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRole } from "@/types/navigation";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = React.useState<"security" | "preferences">("security");

  const currentRole: UserRole = (user?.role || "student") as UserRole;

  return (
    <AppLayout role={currentRole}>
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-6 w-6 text-primary" />
            Cài Đặt Tài Khoản
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Quản lý tùy chọn bảo mật, thông báo và trải nghiệm cá nhân hóa của bạn.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "security"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="h-4 w-4" />
            Bảo Mật & Mật Khẩu
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "preferences"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Moon className="h-4 w-4" />
            Giao Diện & Tùy Chọn
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "security" ? (
          <SecuritySettings />
        ) : (
          <div className="space-y-6 max-w-4xl">
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Moon className="h-4 w-4 text-primary" />
                  Giao Diện Hệ Thống
                </CardTitle>
                <CardDescription className="text-xs">
                  Tùy chỉnh chế độ sáng / tối theo sở thích thị giác của bạn.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">Chế độ hiển thị</p>
                  <p className="text-[11px] text-muted-foreground">
                    Chuyển đổi giữa chế độ Sáng (Light) và Tối (Dark).
                  </p>
                </div>
                <ThemeToggle />
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Thông Báo & Lời Nhắc Học Tập
                </CardTitle>
                <CardDescription className="text-xs">
                  Cấu hình cách hệ thống gửi thông báo và báo cáo tiến độ học TOEIC.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <p className="font-semibold text-foreground">Email nhắc lịch ôn tập Spaced Repetition</p>
                    <p className="text-[11px] text-muted-foreground">
                      Nhận thông báo khi đến hạn ôn lại từ vựng và câu hỏi sai.
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Đang bật
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <p className="font-semibold text-foreground">Báo cáo phân tích năng lực định kỳ tuần</p>
                    <p className="text-[11px] text-muted-foreground">
                      Tóm tắt kết quả thi thử và lời khuyên từ gia sư AI mỗi thứ Hai.
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Đang bật
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
