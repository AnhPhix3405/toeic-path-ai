import { describe, it, expect, vi } from "vitest";
import { authService } from "@/services/auth.service";
import { apiClient } from "@/services/api-client";
import type { UserProfile, ApiResponse } from "@/types/api";
import type { AuthResponseData, RefreshTokenResponse } from "@/types/auth";

describe("authService", () => {
  const mockUser: UserProfile = {
    id: "user-123",
    email: "student@toeicpath.ai",
    fullName: "Nguyễn Văn A",
    role: "student",
    createdAt: "2026-10-06T00:00:00.000Z",
  };

  const mockAuthData: AuthResponseData = {
    user: mockUser,
    tokens: {
      accessToken: "token-abc-123",
      expiresIn: 3600,
      tokenType: "Bearer",
    },
  };

  it("calls login and returns auth response data", async () => {
    const apiResponse: ApiResponse<AuthResponseData> = {
      success: true,
      data: mockAuthData,
      statusCode: 200,
      timestamp: "2026-10-06T00:00:00.000Z",
    };

    vi.spyOn(apiClient, "post").mockResolvedValueOnce(apiResponse);

    const result = await authService.login({
      email: "student@toeicpath.ai",
      password: "Password123@",
    });

    expect(result).toEqual(mockAuthData);
    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      email: "student@toeicpath.ai",
      password: "Password123@",
    });
  });

  it("calls register and returns register response data", async () => {
    const mockRegisterResponse = {
      id: "user-123",
      email: "student@toeicpath.ai",
      role: "student" as const,
      status: "active",
      profile: {
        fullName: "Nguyễn Văn A",
        avatarUrl: null,
        bio: null,
      },
      createdAt: "2026-10-06T00:00:00.000Z",
    };

    const apiResponse = {
      success: true,
      data: mockRegisterResponse,
      statusCode: 201,
      timestamp: "2026-10-06T00:00:00.000Z",
    };

    vi.spyOn(apiClient, "post").mockResolvedValueOnce(apiResponse);

    const result = await authService.register({
      fullName: "Nguyễn Văn A",
      email: "student@toeicpath.ai",
      password: "Password123@!",
      confirmPassword: "Password123@!",
      acceptTerms: true,
    });

    expect(result).toEqual(mockRegisterResponse);
    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
      fullName: "Nguyễn Văn A",
      email: "student@toeicpath.ai",
      password: "Password123@!",
      confirmPassword: "Password123@!",
      acceptTerms: true,
    });
  });

  it("calls getProfile and returns current user profile", async () => {
    const apiResponse: ApiResponse<UserProfile> = {
      success: true,
      data: mockUser,
      statusCode: 200,
      timestamp: "2026-10-06T00:00:00.000Z",
    };

    vi.spyOn(apiClient, "get").mockResolvedValueOnce(apiResponse);

    const result = await authService.getProfile();
    expect(result).toEqual(mockUser);
    expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
  });

  it("calls logout without crashing", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      success: true,
      data: {},
      statusCode: 200,
      timestamp: "2026-10-06T00:00:00.000Z",
    });

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(apiClient.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("calls refreshToken and returns new token data", async () => {
    const refreshData: RefreshTokenResponse = {
      accessToken: "new-token-456",
      expiresIn: 3600,
      tokenType: "Bearer",
    };

    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      success: true,
      data: refreshData,
      statusCode: 200,
      timestamp: "2026-10-06T00:00:00.000Z",
    });

    const result = await authService.refreshToken();
    expect(result).toEqual(refreshData);
    expect(apiClient.post).toHaveBeenCalledWith("/auth/refresh");
  });
});
