import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";
import { authService } from "@/services/auth.service";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

vi.mock("@/services/auth.service", () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("ResetPasswordPage Integration Tests", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("renders InvalidTokenAlert when token query param is missing", () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => (key === "token" ? null : null),
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<ResetPasswordPage />);

    expect(screen.getByText("Liên kết không hợp lệ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Yêu cầu liên kết mới/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mật khẩu mới/i)).not.toBeInTheDocument();
  });

  it("renders form fields when valid token is present in URL", () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => (key === "token" ? "sample-valid-token" : null),
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<ResetPasswordPage />);

    expect(screen.getByRole("heading", { name: "Đặt lại mật khẩu mới" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu mới/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Xác nhận mật khẩu mới/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đặt lại mật khẩu/i })).toBeInTheDocument();
  });

  it("validates password length and complexity on submit", async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => (key === "token" ? "sample-valid-token" : null),
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<ResetPasswordPage />);

    const passwordInput = screen.getByLabelText(/^Mật khẩu mới/i);
    const confirmInput = screen.getByLabelText(/Xác nhận mật khẩu mới/i);
    const submitBtn = screen.getByRole("button", { name: /Đặt lại mật khẩu/i });

    await user.type(passwordInput, "weakpass");
    await user.type(confirmInput, "weakpass");
    await user.click(submitBtn);

    expect(await screen.findByText("Mật khẩu phải chứa ít nhất 12 ký tự")).toBeInTheDocument();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it("validates password mismatch", async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => (key === "token" ? "sample-valid-token" : null),
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<ResetPasswordPage />);

    const passwordInput = screen.getByLabelText(/^Mật khẩu mới/i);
    const confirmInput = screen.getByLabelText(/Xác nhận mật khẩu mới/i);
    const submitBtn = screen.getByRole("button", { name: /Đặt lại mật khẩu/i });

    await user.type(passwordInput, "StrongPassword123!");
    await user.type(confirmInput, "DifferentPass123!");
    await user.click(submitBtn);

    expect(await screen.findByText("Mật khẩu xác nhận không trùng khớp")).toBeInTheDocument();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it("submits valid new password and displays success screen", async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => (key === "token" ? "sample-valid-token" : null),
    } as unknown as ReturnType<typeof useSearchParams>);

    vi.mocked(authService.resetPassword).mockResolvedValueOnce({
      message: "Password reset successful.",
    });

    render(<ResetPasswordPage />);

    const passwordInput = screen.getByLabelText(/^Mật khẩu mới/i);
    const confirmInput = screen.getByLabelText(/Xác nhận mật khẩu mới/i);
    const submitBtn = screen.getByRole("button", { name: /Đặt lại mật khẩu/i });

    await user.type(passwordInput, "StrongPassword123!");
    await user.type(confirmInput, "StrongPassword123!");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith({
        token: "sample-valid-token",
        newPassword: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
      });
      expect(screen.getByText("Đặt lại mật khẩu thành công!")).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith("Mật khẩu đã được đặt lại thành công!");
    });
  });

  it("handles expired token error (400) and displays retry link", async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => (key === "token" ? "expired-token" : null),
    } as unknown as ReturnType<typeof useSearchParams>);

    vi.mocked(authService.resetPassword).mockRejectedValueOnce({
      statusCode: 400,
      message: "Invalid or expired password reset token",
    });

    render(<ResetPasswordPage />);

    const passwordInput = screen.getByLabelText(/^Mật khẩu mới/i);
    const confirmInput = screen.getByLabelText(/Xác nhận mật khẩu mới/i);
    const submitBtn = screen.getByRole("button", { name: /Đặt lại mật khẩu/i });

    await user.type(passwordInput, "StrongPassword123!");
    await user.type(confirmInput, "StrongPassword123!");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Liên kết đặt lại mật khẩu đã hết hạn (sau 15 phút) hoặc đã được sử dụng trước đó."
      );
      expect(screen.getByRole("link", { name: /Yêu cầu liên kết mới/i })).toBeInTheDocument();
    });
  });
});
