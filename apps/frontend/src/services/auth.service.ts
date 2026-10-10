import { apiClient } from "./api-client";
import type {
  LoginDto,
  RegisterDto,
  RegisterResponseData,
  AuthResponseData,
  RefreshTokenResponse,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  MessageResponseDto,
} from "@/types/auth";
import type { UserProfile } from "@/types/api";

/**
 * Chuẩn hóa auth payload từ backend (hỗ trợ cả response phẳng, response bọc data và token dạng phẳng/lồng nhau)
 */
export function normalizeAuthResponse(raw: unknown): AuthResponseData {
  if (!raw || typeof raw !== "object") {
    throw new Error("Phản hồi xác thực không hợp lệ từ máy chủ.");
  }

  const payload =
    "data" in raw && (raw as { data?: unknown }).data && typeof (raw as { data?: unknown }).data === "object"
      ? ((raw as { data: Record<string, unknown> }).data as Record<string, unknown>)
      : (raw as Record<string, unknown>);

  const rawUser = ((payload.user as Record<string, unknown>) || payload) as Record<string, unknown>;
  const rawProfile = (rawUser.profile as Record<string, unknown>) || (payload.profile as Record<string, unknown>) || {};

  const user: UserProfile = {
    id: (rawUser.id as string) || "",
    email: (rawUser.email as string) || "",
    fullName:
      (rawUser.fullName as string) ||
      (rawProfile.fullName as string) ||
      (rawUser.email ? String(rawUser.email).split("@")[0] : "Người dùng"),
    role: ((rawUser.role as string)?.toLowerCase() as UserProfile["role"]) || "student",
    avatarUrl: (rawUser.avatarUrl as string) || (rawProfile.avatarUrl as string) || undefined,
    createdAt: (rawUser.createdAt as string) || new Date().toISOString(),
  };

  const token =
    (payload.tokens as { accessToken?: string })?.accessToken ||
    (payload.accessToken as string) ||
    "";

  const expiresIn =
    (payload.tokens as { expiresIn?: number })?.expiresIn ||
    (payload.accessTokenExpiresIn as number) ||
    900;

  const tokenType =
    (payload.tokens as { tokenType?: string })?.tokenType ||
    "Bearer";

  return {
    user,
    tokens: {
      accessToken: token,
      expiresIn,
      tokenType,
    },
  };
}

export const authService = {
  /**
   * Đăng nhập với email và password
   */
  async login(dto: LoginDto): Promise<AuthResponseData> {
    const raw = await apiClient.post<unknown>("/auth/login", dto);
    return normalizeAuthResponse(raw);
  },

  /**
   * Đăng ký tài khoản học viên mới
   */
  async register(dto: RegisterDto): Promise<RegisterResponseData> {
    const raw = (await apiClient.post<unknown>("/auth/register", dto)) as unknown;
    if (raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data) {
      return (raw as { data: RegisterResponseData }).data;
    }
    return raw as RegisterResponseData;
  },

  /**
   * Đăng nhập / Đăng ký nhanh qua Google ID Token
   */
  async loginWithGoogle(idToken: string): Promise<AuthResponseData> {
    const raw = (await apiClient.post<unknown>("/auth/google", { idToken })) as unknown;
    return normalizeAuthResponse(raw);
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
    const raw = (await apiClient.get<unknown>("/auth/me")) as unknown;
    if (raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data) {
      const unwrapped = (raw as { data: UserProfile }).data;
      return unwrapped;
    }
    return raw as UserProfile;
  },

  /**
   * Làm mới Access Token thông qua Refresh Token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    const raw = (await apiClient.post<unknown>("/auth/refresh")) as unknown;

    const payload =
      raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data
        ? ((raw as { data: Record<string, unknown> }).data as Record<string, unknown>)
        : (raw as Record<string, unknown>);

    return {
      accessToken: (payload?.accessToken as string) || "",
      expiresIn: (payload?.expiresIn as number) || (payload?.accessTokenExpiresIn as number) || 900,
      tokenType: (payload?.tokenType as string) || "Bearer",
    };
  },

  /**
   * Yêu cầu gửi email đặt lại mật khẩu
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    const raw = (await apiClient.post<unknown>("/auth/forgot-password", dto)) as unknown;
    if (raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data) {
      return (raw as { data: MessageResponseDto }).data;
    }
    return (raw as MessageResponseDto) || { message: "Instructions have been sent." };
  },

  /**
   * Đặt lại mật khẩu mới với token từ URL
   */
  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    const raw = (await apiClient.post<unknown>("/auth/reset-password", dto)) as unknown;
    if (raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data) {
      return (raw as { data: MessageResponseDto }).data;
    }
    return (raw as MessageResponseDto) || { message: "Password has been reset successfully." };
  },

  /**
   * Đổi mật khẩu tài khoản người dùng đã xác thực
   */
  async changePassword(dto: ChangePasswordDto): Promise<MessageResponseDto> {
    const raw = (await apiClient.post<unknown>("/auth/change-password", dto)) as unknown;
    if (raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data) {
      return (raw as { data: MessageResponseDto }).data;
    }
    return (raw as MessageResponseDto) || { message: "Password has been changed successfully." };
  },
};

export default authService;
