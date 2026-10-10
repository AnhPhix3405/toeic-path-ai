import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingsPage from "@/app/settings/page";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth.store";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

describe("SettingsPage Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "u1",
        email: "student@toeicpath.ai",
        fullName: "Test Student",
        role: "student",
        createdAt: "2026-01-01",
      },
      token: "jwt-token",
      role: "student",
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      login: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      changePassword: vi.fn(),
    });

    useAuthStore.setState({
      user: {
        id: "u1",
        email: "student@toeicpath.ai",
        fullName: "Test Student",
        role: "student",
        createdAt: "2026-01-01",
      },
      token: "jwt-token",
      role: "student",
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
    });
  });

  it("renders settings page with tabs and default security settings", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: /Cài Đặt Tài Khoản/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bảo Mật & Mật Khẩu/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Giao Diện & Tùy Chọn/i })).toBeInTheDocument();

    // Security tab content should be visible by default
    expect(screen.getByRole("heading", { name: "Đổi Mật Khẩu" })).toBeInTheDocument();
    expect(screen.getByText("Tình Trạng An Toàn Tài Khoản")).toBeInTheDocument();
  });

  it("switches to preferences tab when clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const preferencesTab = screen.getByRole("button", { name: /Giao Diện & Tùy Chọn/i });
    await user.click(preferencesTab);

    expect(screen.getByText("Giao Diện Hệ Thống")).toBeInTheDocument();
    expect(screen.getByText("Thông Báo & Lời Nhắc Học Tập")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Đổi Mật Khẩu" })).not.toBeInTheDocument();
  });
});
