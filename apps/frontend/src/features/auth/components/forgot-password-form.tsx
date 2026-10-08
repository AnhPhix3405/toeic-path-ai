"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, ArrowLeft, Mail, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validations/auth.schema";
import { authService } from "@/services/auth.service";
import { parseApiError } from "@/services/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordForm() {
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState<string>("");
  const [countdown, setCountdown] = React.useState<number>(0);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
    mode: "onBlur",
  });

  // Countdown timer effect
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setApiError(null);
    try {
      await authService.forgotPassword({ email: data.email });
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      setCountdown(RESEND_COOLDOWN_SECONDS);
      toast.success("Yêu cầu đã được gửi!", {
        description: "Vui lòng kiểm tra hộp thư đến của bạn để xem hướng dẫn.",
      });
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.statusCode === 429) {
        const rateLimitMsg = "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.";
        setApiError(rateLimitMsg);
        toast.error(rateLimitMsg);
      } else {
        const errorMsg = parsed.message || "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.";
        setApiError(errorMsg);
        toast.error(errorMsg);
      }
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !submittedEmail || isSubmitting) return;

    setApiError(null);
    try {
      await authService.forgotPassword({ email: submittedEmail });
      setCountdown(RESEND_COOLDOWN_SECONDS);
      toast.success("Đã gửi lại email hướng dẫn!", {
        description: "Vui lòng kiểm tra lại hòm thư email của bạn.",
      });
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.statusCode === 429) {
        const rateLimitMsg = "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.";
        setApiError(rateLimitMsg);
        toast.error(rateLimitMsg);
      } else {
        const errorMsg = parsed.message || "Gửi lại email thất bại. Vui lòng thử lại sau.";
        setApiError(errorMsg);
        toast.error(errorMsg);
      }
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Kiểm tra hòm thư của bạn
          </h2>
          <p className="text-sm text-muted-foreground">
            Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến địa chỉ email:
          </p>
          <p className="text-sm font-semibold text-foreground bg-muted/50 py-1.5 px-3 rounded-md inline-block">
            {submittedEmail}
          </p>
          <p className="text-xs text-muted-foreground pt-1">
            Liên kết có hiệu lực trong vòng <strong>15 phút</strong>. Nếu không thấy email trong hộp thư đến, vui lòng kiểm tra mục Thư rác (Spam).
          </p>
        </div>

        {apiError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive text-left"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-10"
            disabled={countdown > 0 || isSubmitting}
            onClick={handleResend}
          >
            {countdown > 0 ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                <span>Gửi lại email sau ({countdown}s)</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Gửi lại email</span>
              </>
            )}
          </Button>

          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại trang Đăng nhập</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {apiError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="email"
            className="text-sm font-medium leading-none text-foreground"
          >
            Địa chỉ email tài khoản <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="example@domain.com"
              autoComplete="email"
              disabled={isSubmitting}
              error={!!errors.email}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-10 font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang gửi yêu cầu...
            </>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              Gửi liên kết đặt lại mật khẩu
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
