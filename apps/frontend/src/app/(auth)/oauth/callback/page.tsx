"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import { parseApiError } from "@/services/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    async function handleOAuthCallback() {
      const oauthError = searchParams.get("error");
      const accessToken = searchParams.get("token") || searchParams.get("accessToken");
      const redirectParam = searchParams.get("redirect");

      if (oauthError) {
        if (!isMounted) return;
        const msg =
          oauthError === "access_denied"
            ? "Đăng nhập Google đã bị hủy."
            : "Đăng nhập Google không thành công. Vui lòng thử lại.";
        setError(msg);
        toast.error(msg);
        setIsProcessing(false);
        return;
      }

      try {
        if (accessToken) {
          useAuthStore.getState().setToken(accessToken);
          const user = await authService.getProfile();
          useAuthStore.getState().setAuth(user, accessToken);

          if (!isMounted) return;
          toast.success("Đăng nhập bằng Google thành công!");

          if (redirectParam && redirectParam.startsWith("/")) {
            router.push(redirectParam);
          } else {
            switch (user.role) {
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
        } else {
          // Attempt fetching profile directly in case backend set cookies
          const user = await authService.getProfile();
          useAuthStore.getState().setUser(user);

          if (!isMounted) return;
          toast.success("Đăng nhập bằng Google thành công!");

          if (redirectParam && redirectParam.startsWith("/")) {
            router.push(redirectParam);
          } else {
            switch (user.role) {
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
        }
      } catch (err) {
        if (!isMounted) return;
        const parsed = parseApiError(err);
        const errorMsg =
          parsed.message || "Không thể xác thực thông tin tài khoản Google.";
        setError(errorMsg);
        toast.error(errorMsg);
        setIsProcessing(false);
      }
    }

    handleOAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-lg border-border/80 text-center p-6">
        <CardContent className="space-y-6 pt-6">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Đang xử lý đăng nhập</h2>
                <p className="text-sm text-muted-foreground">
                  Vui lòng đợi trong giây lát khi chúng tôi hoàn tất xác thực Google...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-destructive">
                  Đăng nhập thất bại
                </h2>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button
                onClick={() => router.push("/login")}
                className="w-full mt-4"
              >
                Quay lại trang Đăng nhập
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
