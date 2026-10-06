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
        await authService.register(dto);
        // Sau khi tạo tài khoản thành công, tự động đăng nhập để thiết lập phiên làm việc
        const loginResponse = await authService.login({
          email: dto.email,
          password: dto.password,
        });
        setAuth(loginResponse.user, loginResponse.tokens.accessToken);
        toast.success("Đăng ký tài khoản thành công!", {
          description: `Chào mừng ${loginResponse.user.fullName} đến với TOEIC Path AI.`,
        });
        return loginResponse.user;
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading]
  );

  const loginWithGoogle = React.useCallback(
    async (idToken: string): Promise<UserProfile> => {
      setLoading(true);
      try {
        const response = await authService.loginWithGoogle(idToken);
        setAuth(response.user, response.tokens.accessToken);
        toast.success("Đăng nhập Google thành công!", {
          description: `Chào mừng ${response.user.fullName} đến với TOEIC Path AI.`,
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
    loginWithGoogle,
    logout,
    refreshProfile,
  };
}
