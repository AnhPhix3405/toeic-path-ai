"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { registerSchema, type RegisterFormValues } from "@/lib/validations/auth.schema";
import { useAuth } from "@/hooks/use-auth";
import { parseApiError } from "@/lib/api-client";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { SocialLogin } from "@/components/auth/social-login";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TARGET_SCORE_OPTIONS = [
  { value: "450", label: "450 - Khởi động (Foundation)" },
  { value: "600", label: "600 - Trung cấp (Standard B1)" },
  { value: "750", label: "750 - Nâng cao (Professional B2)" },
  { value: "850", label: "850 - Thành thạo (Advanced C1)" },
  { value: "990", label: "990 - Tối đa (Mastery)" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register: authRegister } = useAuth();
  const [apiError, setApiError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      targetScore: undefined,
      password: "",
      confirmPassword: "",
      acceptTerms: false as unknown as true,
    },
    mode: "onBlur",
  });

  const acceptTerms = watch("acceptTerms");
  const targetScore = watch("targetScore");

  const onSubmit = async (data: RegisterFormValues) => {
    setApiError(null);
    try {
      await authRegister({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        targetScore: data.targetScore ? Number(data.targetScore) : undefined,
      });

      toast.success("Tạo tài khoản thành công! Chào mừng bạn đến với TOEIC Path AI.");
      router.push("/dashboard");
    } catch (err) {
      const parsed = parseApiError(err);
      const errorMessage =
        parsed.message || "Đăng ký không thành công. Vui lòng thử lại.";
      setApiError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AuthCard
        title="Tạo tài khoản mới"
        description="Bắt đầu hành trình chinh phục TOEIC với lộ trình cá nhân hóa AI"
        switchText="Đã có tài khoản?"
        switchActionText="Đăng nhập ngay"
        switchHref="/login"
      >
        <SocialLogin
          isLoading={isSubmitting}
          dividerText="Hoặc đăng ký bằng email"
        />

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
          {/* Full Name */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="fullName"
              className="text-sm font-medium leading-none text-foreground"
            >
              Họ và tên <span className="text-destructive">*</span>
            </label>
            <Input
              id="fullName"
              type="text"
              placeholder="Nguyễn Văn A"
              autoComplete="name"
              disabled={isSubmitting}
              error={!!errors.fullName}
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none text-foreground"
            >
              Email <span className="text-destructive">*</span>
            </label>
            <Input
              id="email"
              type="email"
              placeholder="example@domain.com"
              autoComplete="email"
              disabled={isSubmitting}
              error={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Target Score Selection */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="targetScore"
              className="text-sm font-medium leading-none text-foreground"
            >
              Mục tiêu điểm TOEIC (Tùy chọn)
            </label>
            <Select
              value={targetScore ? String(targetScore) : undefined}
              onValueChange={(val) => setValue("targetScore", Number(val), { shouldValidate: true })}
              disabled={isSubmitting}
            >
              <SelectTrigger id="targetScore" className="w-full">
                <SelectValue placeholder="Chọn mục tiêu điểm mong muốn" />
              </SelectTrigger>
              <SelectContent>
                {TARGET_SCORE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.targetScore && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {errors.targetScore.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none text-foreground"
            >
              Mật khẩu <span className="text-destructive">*</span>
            </label>
            <PasswordInput
              id="password"
              placeholder="Tối thiểu 8 ký tự, 1 chữ hoa, 1 số"
              autoComplete="new-password"
              disabled={isSubmitting}
              showStrengthMeter
              error={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium leading-none text-foreground"
            >
              Xác nhận mật khẩu <span className="text-destructive">*</span>
            </label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Nhập lại mật khẩu"
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

          {/* Accept Terms Checkbox */}
          <div className="space-y-1 pt-1 text-left">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="acceptTerms"
                checked={acceptTerms === true}
                onCheckedChange={(checked) =>
                  setValue("acceptTerms", checked === true ? true : (false as unknown as true), {
                    shouldValidate: true,
                  })
                }
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <label
                htmlFor="acceptTerms"
                className="text-xs text-muted-foreground leading-snug cursor-pointer select-none"
              >
                Tôi đồng ý với{" "}
                <Link
                  href="/terms"
                  className="font-medium text-primary hover:underline underline-offset-2"
                  target="_blank"
                >
                  Điều khoản dịch vụ
                </Link>{" "}
                và{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-primary hover:underline underline-offset-2"
                  target="_blank"
                >
                  Chính sách bảo mật
                </Link>
                .
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {errors.acceptTerms.message}
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
                Đang tạo tài khoản...
              </>
            ) : (
              "Đăng ký tài khoản"
            )}
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}
