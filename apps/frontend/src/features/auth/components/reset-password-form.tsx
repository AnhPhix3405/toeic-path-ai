"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Loader2,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validations/auth.schema";
import { authService } from "@/services/auth.service";
import { parseApiError } from "@/services/api-client";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isSuccess, setIsSuccess] = React.useState(false);
  const [redirectCountdown, setRedirectCountdown] = React.useState(3);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [isTokenExpired, setIsTokenExpired] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const passwordValue = watch("password") || "";

  // 3-second auto-redirect countdown when success
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccess && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isSuccess && redirectCountdown === 0) {
      router.push("/login");
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isSuccess, redirectCountdown, router]);

  // If token is missing from URL query parameter
  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Liên kết không hợp lệ
          </h2>
          <p className="text-sm text-muted-foreground">
            Liên kết đặt lại mật khẩu không chứa mã xác thực (token) hợp lệ hoặc đã bị cắt ngắn.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button asChild className="w-full h-10 font-semibold">
            <Link href="/forgot-password">
              <KeyRound className="mr-2 h-4 w-4" />
              Yêu cầu liên kết mới
            </Link>
          </Button>

          <div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại trang Đăng nhập</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If password reset succeeds
  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Đặt lại mật khẩu thành công!
          </h2>
          <p className="text-sm text-muted-foreground">
            Mật khẩu mới của bạn đã được cập nhật thành công. Bạn có thể sử dụng mật khẩu mới này để đăng nhập.
          </p>
          <p className="text-xs text-muted-foreground pt-1">
            Tự động chuyển hướng về trang Đăng nhập trong <strong>{redirectCountdown} giây</strong>...
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            className="w-full h-10 font-semibold"
            onClick={() => router.push("/login")}
          >
            Đăng nhập ngay
          </Button>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setApiError(null);
    setIsTokenExpired(false);
    try {
      await authService.resetPassword({
        token,
        newPassword: data.password,
        confirmPassword: data.confirmPassword,
      });

      setIsSuccess(true);
      toast.success("Mật khẩu đã được đặt lại thành công!");
    } catch (err) {
      const parsed = parseApiError(err);
      if (
        parsed.statusCode === 400 &&
        (parsed.message.toLowerCase().includes("token") ||
          parsed.message.toLowerCase().includes("invalid") ||
          parsed.message.toLowerCase().includes("expired"))
      ) {
        setIsTokenExpired(true);
        const expiredMsg =
          "Liên kết đặt lại mật khẩu đã hết hạn (sau 15 phút) hoặc đã được sử dụng trước đó.";
        setApiError(expiredMsg);
        toast.error(expiredMsg);
      } else if (parsed.statusCode === 429) {
        const rateLimitMsg = "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.";
        setApiError(rateLimitMsg);
        toast.error(rateLimitMsg);
      } else {
        const errorMsg = parsed.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.";
        setApiError(errorMsg);
        toast.error(errorMsg);
      }
    }
  };

  return (
    <div className="space-y-4">
      {apiError && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive"
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{apiError}</span>
          </div>
          {isTokenExpired && (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="w-full border-destructive/40 hover:bg-destructive/10 text-destructive"
              >
                <Link href="/forgot-password">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Yêu cầu liên kết mới
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* New Password */}
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="password"
            className="text-sm font-medium leading-none text-foreground"
          >
            Mật khẩu mới <span className="text-destructive">*</span>
          </label>
          <PasswordInput
            id="password"
            placeholder="Tối thiểu 12 ký tự, gồm chữ hoa, thường, số & ký tự đặc biệt"
            autoComplete="new-password"
            disabled={isSubmitting}
            error={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {errors.password.message}
            </p>
          )}

          {/* Interactive Strength Meter */}
          <PasswordStrengthMeter password={passwordValue} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium leading-none text-foreground"
          >
            Xác nhận mật khẩu mới <span className="text-destructive">*</span>
          </label>
          <PasswordInput
            id="confirmPassword"
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            disabled={isSubmitting}
            error={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-10 font-semibold mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang cập nhật mật khẩu...
            </>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4" />
              Đặt lại mật khẩu
            </span>
          )}
        </Button>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại đăng nhập</span>
          </Link>
        </div>
      </form>
    </div>
  );
}
