"use client";

import * as React from "react";
import { AlertCircle, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/use-profile";
import { useAuthStore } from "@/stores/auth.store";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { AvatarUpload } from "@/features/profile/components/avatar-upload";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { ProfileSkeleton } from "@/features/profile/components/profile-skeleton";
import type { UserRole } from "@/types/navigation";

export default function ProfilePage() {
  const { data: profileData, isLoading, isError, error, refetch } = useProfile();
  const user = useAuthStore((state) => state.user);

  // Determine current active layout role (defaults to student if not yet initialized)
  const currentRole: UserRole = (profileData?.role || user?.role || "student") as UserRole;

  return (
    <AppLayout role={currentRole}>
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        {isLoading ? (
          <ProfileSkeleton />
        ) : isError || !profileData ? (
          <Card className="border-destructive/30 bg-destructive/5 text-center p-8">
            <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-bold text-foreground">Không thể tải thông tin hồ sơ</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  {error instanceof Error
                    ? error.message
                    : "Đã xảy ra sự cố trong quá trình kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền."}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="gap-2 mt-2"
              >
                <RefreshCw className="h-4 w-4" />
                Thử lại
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Hero Profile Banner Header */}
            <ProfileHeader profileData={profileData} />

            {/* Main 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: Avatar Dropzone & Pro Tips Card */}
              <div className="space-y-6 lg:col-span-1">
                <Card className="border-border/80 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-foreground">
                      Ảnh Đại Diện
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <AvatarUpload
                      currentAvatarUrl={profileData.profile.avatarUrl}
                      fullName={profileData.profile.fullName}
                    />
                  </CardContent>
                </Card>

                <Card className="border-border/80 bg-linear-to-br from-primary/5 via-card to-card shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Mẹo Cá Nhân Hóa AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2.5">
                    <p>
                      Cập nhật đầy đủ <strong>mục tiêu học tập</strong> trong phần tiểu sử để gia sư AI tự động tinh chỉnh lộ trình và bài tập phù hợp nhất với bạn.
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Thông tin được bảo vệ theo chuẩn mã hóa AES-256.</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Profile Form & Account Summary */}
              <div className="lg:col-span-2">
                <ProfileForm profileData={profileData} />
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
