"use client";

import * as React from "react";
import { Shield, Smartphone, KeySquare, CheckCircle2, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "./change-password-form";
import { cn } from "@/lib/utils";

interface SecuritySettingsProps {
  className?: string;
}

export function SecuritySettings({ className }: SecuritySettingsProps) {
  return (
    <div className={cn("space-y-6 max-w-4xl", className)}>
      {/* Change Password Form */}
      <ChangePasswordForm />

      {/* Account Security Information Card */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base font-bold text-foreground">
                Tình Trạng An Toàn Tài Khoản
              </CardTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
              Mức độ an toàn: Tốt
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Tổng quan các chính sách bảo mật đang được áp dụng cho tài khoản của bạn.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-accent/20 p-3">
              <KeySquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Mã Hóa Mật Khẩu</p>
                <p className="text-muted-foreground mt-0.5">
                  Mật khẩu được lưu trữ dưới dạng băm 1 chiều chuẩn Bcrypt, hệ thống không lưu mật khẩu thô.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-accent/20 p-3">
              <History className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Quản Lý Phiên Đăng Nhập</p>
                <p className="text-muted-foreground mt-0.5">
                  Khi đổi mật khẩu thành công, toàn bộ phiên đăng nhập trên các thiết bị khác sẽ được tự động thu hồi.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3.5 border border-border/40 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Khuyến nghị bảo mật từ TOEIC Path AI:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Không chia sẻ tài khoản cho người khác để đảm bảo tính cá nhân hóa của lộ trình học AI.</li>
              <li>Sử dụng mật khẩu dài từ 12 ký tự trở lên kết hợp ký tự đặc biệt.</li>
              <li>Thay đổi mật khẩu ít nhất 3 - 6 tháng một lần.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SecuritySettings;
