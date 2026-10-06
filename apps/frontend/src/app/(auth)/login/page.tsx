"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { loginSchema, type LoginFormValues } from "@/lib/validations/auth.schema";
import { useAuth } from "@/hooks/use-auth";
import { parseApiError } from "@/lib/api-client";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { SocialLogin } from "@/components/auth/social-login";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { login } = useAuth();
  const [apiError, setApiError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    mode: "onBlur",
  });

  const rememberMe = watch("rememberMe");

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);
    try {
      const user = await login({
        email: data.email,
        password: data.password,
      });

      toast.success("Đăng nhập thành công!");

      // Determine destination
      if (redirectParam && redirectParam.startsWith("/")) {
        router.push(redirectParam);
      } else {
        switch (user?.role) {
          case "admin":
            router.push("/admin-dashboard");
            break;
          case "teacher":
            router.push("/teacher-dashboard");
            break;
          case "student":
          default:
            router.push("/dashboard");
            break;
        }
      }
    } catch (err) {
      const parsed = parseApiError(err);
      const errorMessage =
        parsed.message || "Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.";
      setApiError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AuthCard
        title="Chào mừng trở lại"
        description="Đăng nhập tài khoản để tiếp tục lộ trình luyện thi TOEIC AI"
        switchText="Chưa có tài khoản?"
        switchActionText="Đăng ký ngay"
        switchHref="/register"
      >
        <SocialLogin isLoading={isSubmitting} />

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
          {/* Email Field */}
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

          {/* Password Field */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none text-foreground"
              >
                Mật khẩu <span className="text-destructive">*</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline underline-offset-4"
                tabIndex={isSubmitting ? -1 : 0}
              >
                Quên mật khẩu?
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting}
              error={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setValue("rememberMe", !!checked)}
              disabled={isSubmitting}
            />
            <label
              htmlFor="rememberMe"
              className="text-sm font-normal text-muted-foreground cursor-pointer select-none"
            >
              Ghi nhớ đăng nhập
            </label>
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
                Đang xử lý...
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}
