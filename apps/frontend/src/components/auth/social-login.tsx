"use client";

import * as React from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { parseApiError } from "@/services/api-client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (notification?: (notification: unknown) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

export interface SocialLoginProps {
  isLoading?: boolean;
  dividerText?: string;
  onGoogleClick?: () => void;
}

export function SocialLogin({
  isLoading = false,
  dividerText = "Hoặc tiếp tục với email",
  onGoogleClick,
}: SocialLoginProps) {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const googleBtnContainerRef = React.useRef<HTMLDivElement>(null);

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = React.useCallback(
    async (response: { credential: string }) => {
      if (!response?.credential) {
        toast.error("Không nhận được mã xác thực từ Google.");
        return;
      }

      setIsGoogleLoading(true);
      try {
        const user = await loginWithGoogle(response.credential);
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
      } catch (err) {
        const parsed = parseApiError(err);
        toast.error(parsed.message || "Xác thực tài khoản Google thất bại.");
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [loginWithGoogle, router]
  );

  const initGoogleAuth = React.useCallback(() => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId || "",
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: "384",
          });
        }
      } catch {
        // Ignore initialization issues in offline / test environments
      }
    }
  }, [googleClientId, handleCredentialResponse]);

  React.useEffect(() => {
    initGoogleAuth();
  }, [initGoogleAuth]);

  const handleGoogleLogin = () => {
    if (onGoogleClick) {
      onGoogleClick();
      return;
    }

    if (!googleClientId || googleClientId.includes("your-google-client-id")) {
      toast.info("Tính năng Google Sign-In yêu cầu Google Client ID", {
        description:
          "Vui lòng thiết lập biến môi trường NEXT_PUBLIC_GOOGLE_CLIENT_ID trong file .env để kết nối với Google Cloud Console.",
      });
      return;
    }

    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      // 1. Thử kích hoạt qua rendered button bên trong container
      const renderedBtn = googleBtnContainerRef.current?.querySelector<HTMLElement>(
        "div[role=button], button"
      );
      if (renderedBtn) {
        renderedBtn.click();
        return;
      }

      // 2. Kích hoạt prompt kèm debug logger nếu button chưa render
      try {
        window.google.accounts.id.prompt((notification: unknown) => {
          const notif = notification as {
            isNotDisplayed?: () => boolean;
            getNotDisplayedReason?: () => string;
            isSkippedMoment?: () => boolean;
            getSkippedReason?: () => string;
            isDismissedMoment?: () => boolean;
            getDismissedReason?: () => string;
          };

          if (notif?.isNotDisplayed?.()) {
            const reason = notif.getNotDisplayedReason?.();
            console.warn("[Google Sign-In] Prompt not displayed reason:", reason);
            if (reason === "suppressed_by_user" || reason === "cool_down") {
              toast.info(
                "Google One Tap đang trong thời gian chờ (cooldown). Vui lòng click trực tiếp nút Google hoặc thử lại trên tab ẩn danh."
              );
            }
          }
        });
      } catch (err) {
        toast.error("Không thể mở cửa sổ đăng nhập Google: " + (err as Error)?.message);
      }
    } else {
      toast.error("Google Identity SDK đang tải, vui lòng thử lại sau vài giây.");
    }
  };

  const busy = isLoading || isGoogleLoading;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogleAuth}
      />

      {/* Hidden container where official Google Sign-In button is rendered */}
      <div
        ref={googleBtnContainerRef}
        className="hidden"
        aria-hidden="true"
      />

      <div className="w-full space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-3 h-10 border-input hover:bg-accent/50 transition-colors"
          onClick={handleGoogleLogin}
          disabled={busy}
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span className="font-medium text-sm">
            {isGoogleLoading ? "Đang xác thực Google..." : "Đăng nhập với Google"}
          </span>
        </Button>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider">
            {dividerText}
          </div>
        </div>
      </div>
    </>
  );
}
