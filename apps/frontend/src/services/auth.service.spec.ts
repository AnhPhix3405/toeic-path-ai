import { describe, it, expect, vi } from "vitest";
import { authService } from "./auth.service";
import { apiClient } from "./api-client";
import type { ApiResponse } from "@/types/api";

describe("authService Password Reset Methods", () => {
  it("calls forgotPassword and returns message response", async () => {
    const mockResponse = {
      message: "If the email is registered, password reset instructions will be sent",
    };

    vi.spyOn(apiClient, "post").mockResolvedValueOnce(
      mockResponse as unknown as ApiResponse<unknown>
    );

    const result = await authService.forgotPassword({
      email: "student@toeicpath.ai",
    });

    expect(result).toEqual(mockResponse);
    expect(apiClient.post).toHaveBeenCalledWith("/auth/forgot-password", {
      email: "student@toeicpath.ai",
    });
  });

  it("calls resetPassword and returns success message", async () => {
    const mockResponse = {
      message: "Password has been reset successfully. Please log in with your new password.",
    };

    vi.spyOn(apiClient, "post").mockResolvedValueOnce(
      mockResponse as unknown as ApiResponse<unknown>
    );

    const result = await authService.resetPassword({
      token: "valid-reset-token",
      newPassword: "StrongPassword123!",
      confirmPassword: "StrongPassword123!",
    });

    expect(result).toEqual(mockResponse);
    expect(apiClient.post).toHaveBeenCalledWith("/auth/reset-password", {
      token: "valid-reset-token",
      newPassword: "StrongPassword123!",
      confirmPassword: "StrongPassword123!",
    });
  });

  it("calls changePassword and returns success message", async () => {
    const mockResponse = {
      message: "Password has been changed successfully.",
    };

    vi.spyOn(apiClient, "post").mockResolvedValueOnce(
      mockResponse as unknown as ApiResponse<unknown>
    );

    const result = await authService.changePassword({
      currentPassword: "OldPassword123!",
      newPassword: "NewSecurePassword456!@",
      confirmNewPassword: "NewSecurePassword456!@",
    });

    expect(result).toEqual(mockResponse);
    expect(apiClient.post).toHaveBeenCalledWith("/auth/change-password", {
      currentPassword: "OldPassword123!",
      newPassword: "NewSecurePassword456!@",
      confirmNewPassword: "NewSecurePassword456!@",
    });
  });
});
