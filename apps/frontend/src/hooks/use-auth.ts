import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import type { LoginDto, RegisterDto } from "@/types/auth";
import type { UserProfile } from "@/types/api";

export function useAuth() {
  const router = useRouter();
  const {
    user,
    token,
    role,
    isAuthenticated,
    isLoading,
    isInitialized,
    setAuth,
    setUser,
    clearAuth,
    setLoading,
  } = useAuthStore();

  const login = React.useCallback(
    async (dto: LoginDto): Promise<UserProfile> => {
      setLoading(true);
      try {
        const response = await authService.login(dto);
        setAuth(response.user, response.tokens.accessToken);
        toast.success("Đăng nhập thành công!", {
          description: `Chào mừng ${response.user.fullName} quay trở lại.`,
        });
        return response.user;
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading]
  );

  const register = React.useCallback(
    async (dto: RegisterDto): Promise<UserProfile> => {
      setLoading(true);
      try {
        const response = await authService.register(dto);
        setAuth(response.user, response.tokens.accessToken);
        toast.success("Đăng ký tài khoản thành công!", {
          description: "Tài khoản của bạn đã sẵn sàng sử dụng.",
        });
        return response.user;
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading]
  );

  const logout = React.useCallback(
    async (redirectUrl = "/login") => {
      setLoading(true);
      try {
        await authService.logout();
      } catch {
        // Continue local cleanup even if server request fails
      } finally {
        clearAuth();
        toast.info("Đã đăng xuất", {
          description: "Hẹn gặp lại bạn trong các buổi học tiếp theo.",
        });
        if (redirectUrl) {
          router.push(redirectUrl);
        }
      }
    },
    [clearAuth, router, setLoading]
  );

  const refreshProfile = React.useCallback(async (): Promise<UserProfile | null> => {
    try {
      const freshUser = await authService.getProfile();
      setUser(freshUser);
      return freshUser;
    } catch {
      return null;
    }
  }, [setUser]);

  return {
    user,
    token,
    role,
    isAuthenticated,
    isLoading,
    isInitialized,
    login,
    register,
    logout,
    refreshProfile,
  };
}
