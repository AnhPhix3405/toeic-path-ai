import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OAuthCallbackPage from "@/app/(auth)/oauth/callback/page";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

vi.mock("@/services/auth.service", () => ({
  authService: {
    getProfile: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("OAuthCallbackPage Integration Tests", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as any);
  });

  it("handles OAuth error parameter and displays error alert", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("error=access_denied") as any);

    render(<OAuthCallbackPage />);

    expect(await screen.findByText("Đăng nhập thất bại")).toBeInTheDocument();
    expect(screen.getByText("Đăng nhập Google đã bị hủy.")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Đăng nhập Google đã bị hủy.");
  });

  it("handles valid access token from OAuth redirect and redirects student to /dashboard", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=oauth-access-token-123&refreshToken=oauth-refresh-token-456") as any
    );

    vi.mocked(authService.getProfile).mockResolvedValueOnce({
      id: "u-oauth",
      email: "googleuser@gmail.com",
      fullName: "Google User",
      role: "student",
      createdAt: "2026-01-01",
    });

    render(<OAuthCallbackPage />);

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe("oauth-access-token-123");
      expect(useAuthStore.getState().user?.email).toBe("googleuser@gmail.com");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
      expect(toast.success).toHaveBeenCalledWith("Đăng nhập bằng Google thành công!");
    });
  });

  it("handles valid OAuth login and honors redirect URL parameter", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=oauth-access-token-123&redirect=/study/lesson-1") as any
    );

    vi.mocked(authService.getProfile).mockResolvedValueOnce({
      id: "u-oauth",
      email: "googleuser@gmail.com",
      fullName: "Google User",
      role: "student",
      createdAt: "2026-01-01",
    });

    render(<OAuthCallbackPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/study/lesson-1");
    });
  });
});
