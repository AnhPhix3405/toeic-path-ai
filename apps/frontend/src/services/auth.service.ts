import { apiClient } from "./api-client";
import type {
  LoginDto,
  RegisterDto,
  AuthResponseData,
  RefreshTokenResponse,
} from "@/types/auth";
import type { UserProfile } from "@/types/api";

export const authService = {
  /**
   * Đăng nhập với email và password
   */
  async login(dto: LoginDto): Promise<AuthResponseData> {
    const response = await apiClient.post<AuthResponseData>("/auth/login", dto);
    return response.data;
  },

  /**
   * Đăng ký tài khoản học viên mới
   */
  async register(dto: RegisterDto): Promise<AuthResponseData> {
    const response = await apiClient.post<AuthResponseData>("/auth/register", dto);
    return response.data;
  },

  /**
   * Đăng nhập / Đăng ký nhanh qua Google ID Token
   */
  async loginWithGoogle(idToken: string): Promise<AuthResponseData> {
    const response = await apiClient.post<
      AuthResponseData | { accessToken: string; user: UserProfile }
    >("/auth/google", { idToken });

    if (response && typeof response === "object" && "data" in response && (response as { data?: unknown }).data) {
      return (response as { data: AuthResponseData }).data;
    }

    const raw = response as unknown as {
      accessToken: string;
      user: UserProfile;
      tokens?: { accessToken: string; expiresIn: number; tokenType: string };
    };
    return {
      user: raw.user,
      tokens: raw.tokens || {
        accessToken: raw.accessToken,
        expiresIn: 900,
        tokenType: "Bearer",
      },
    };
  },

  /**
   * Đăng xuất và xóa phiên làm việc
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore network errors on logout to allow local cleanup
    }
  },

  /**
   * Lấy thông tin hồ sơ người dùng hiện tại
   */
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>("/auth/me");
    return response.data;
  },

  /**
   * Làm mới Access Token thông qua Refresh Token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>("/auth/refresh");
    return response.data;
  },
};

export default authService;
