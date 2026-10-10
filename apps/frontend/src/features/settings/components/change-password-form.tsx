"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, ShieldCheck, AlertCircle, Loader2, RotateCcw, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/lib/validations/auth.schema";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth.store";
import { parseApiError } from "@/services/api-client";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChangePasswordFormProps {
  className?: string;
  isOAuthUser?: boolean;
}

export function ChangePasswordForm({ className, isOAuthUser = false }: ChangePasswordFormProps) {
  const { changePassword } = useAuth();
  const user = useAuthStore((state) => state.user);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const defaultValues: ChangePasswordFormValues = {
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues,
    mode: "onBlur",
  });

  const newPasswordValue = watch("newPassword");

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setApiError(null);
    setSuccessMessage(null);

    try {
      const response = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmNewPassword,
      });

      setSuccessMessage(
        response.message || "Mật khẩu của bạn đã được thay đổi thành công!"
      );
      reset(defaultValues);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      let message = parsed.message;

      // Map backend error messages to friendly Vietnamese
      if (message.includes("Current password is incorrect")) {
        message = "Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.";
      } else if (message.includes("New password cannot be the same")) {
        message = "Mật khẩu mới không được trùng với mật khẩu hiện tại.";
      } else if (message.includes("Account registered with Google")) {
        message = "Tài khoản đăng nhập qua Google không thể đổi mật khẩu trực tiếp.";
      }

      setApiError(message);
      toast.error("Không thể đổi mật khẩu", { description: message });
    }
  };

  const handleReset = () => {
    reset(defaultValues);
    setApiError(null);
  };

  if (isOAuthUser) {
    return (
      <Card className={cn("border-border/80 shadow-xs", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <KeyRound className="h-5 w-5" />
            <CardTitle className="text-base sm:text-lg font-bold">
              Đổi Mật Khẩu
            </CardTitle>
          </div>
          <CardDescription>
            Bảo mật tài khoản bằng cách thay đổi mật khẩu định kỳ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="status"
            className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-700 dark:text-blue-300"
          >
            <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Tài khoản liên kết Google</p>
              <p>
                Tài khoản <strong>{user?.email}</strong> được đăng nhập thông qua Google OAuth. Bạn không cần thiết lập hoặc thay đổi mật khẩu trực tiếp trên hệ thống này.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/80 shadow-xs", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold">
              Đổi Mật Khẩu
            </CardTitle>
            <CardDescription className="text-xs">
              Cập nhật mật khẩu thường xuyên để tăng cường an toàn cho tài khoản.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {apiError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in-50"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in-50"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Current Password */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="currentPassword"
              className="text-xs font-semibold text-foreground flex items-center justify-between"
            >
              <span>
                Mật khẩu hiện tại <span className="text-destructive">*</span>
              </span>
            </label>
            <PasswordInput
              id="currentPassword"
              placeholder="Nhập mật khẩu bạn đang sử dụng"
              autoComplete="current-password"
              disabled={isSubmitting}
              error={!!errors.currentPassword}
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-[11px] text-destructive mt-1" role="alert">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="newPassword"
              className="text-xs font-semibold text-foreground flex items-center justify-between"
            >
              <span>
                Mật khẩu mới <span className="text-destructive">*</span>
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                (Tối thiểu 12 ký tự)
              </span>
            </label>
            <PasswordInput
              id="newPassword"
              placeholder="Nhập mật khẩu mới gồm chữ hoa, thường, số & ký tự đặc biệt"
              autoComplete="new-password"
              showStrengthMeter
              disabled={isSubmitting}
              error={!!errors.newPassword}
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-[11px] text-destructive mt-1" role="alert">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="confirmNewPassword"
              className="text-xs font-semibold text-foreground"
            >
              Xác nhận mật khẩu mới <span className="text-destructive">*</span>
            </label>
            <PasswordInput
              id="confirmNewPassword"
              placeholder="Nhập lại mật khẩu mới vừa đặt"
              autoComplete="new-password"
              disabled={isSubmitting}
              error={!!errors.confirmNewPassword}
              {...register("confirmNewPassword")}
            />
            {errors.confirmNewPassword && (
              <p className="text-[11px] text-destructive mt-1" role="alert">
                {errors.confirmNewPassword.message}
              </p>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Mật khẩu được mã hóa an toàn với chuẩn Bcrypt</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!isDirty || isSubmitting}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Hủy bỏ
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={!isDirty || isSubmitting}
                className="gap-1.5 text-xs font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-3.5 w-3.5" />
                    Đổi mật khẩu
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ChangePasswordForm;
