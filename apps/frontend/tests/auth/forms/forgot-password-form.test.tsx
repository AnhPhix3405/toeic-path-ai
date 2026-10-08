import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import { authService } from "@/services/auth.service";
import { toast } from "sonner";

vi.mock("@/services/auth.service", () => ({
  authService: {
    forgotPassword: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("ForgotPasswordPage Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form fields and controls", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByRole("heading", { name: "Quên mật khẩu?" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Địa chỉ email tài khoản/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gửi liên kết đặt lại mật khẩu/i })).toBeInTheDocument();
  });

  it("validates empty email on submit", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    const submitBtn = screen.getByRole("button", { name: /Gửi liên kết đặt lại mật khẩu/i });
    await user.click(submitBtn);

    expect(await screen.findByText("Vui lòng nhập địa chỉ email")).toBeInTheDocument();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it("validates invalid email format", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    const input = screen.getByLabelText(/Địa chỉ email tài khoản/i);
    await user.type(input, "invalid-email");
    const submitBtn = screen.getByRole("button", { name: /Gửi liên kết đặt lại mật khẩu/i });
    await user.click(submitBtn);

    expect(await screen.findByText("Địa chỉ email không hợp lệ")).toBeInTheDocument();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it("submits valid email and renders instruction screen with cooldown timer", async () => {
    const user = userEvent.setup();
    vi.mocked(authService.forgotPassword).mockResolvedValueOnce({
      message: "If the email is registered, instructions will be sent.",
    });

    render(<ForgotPasswordPage />);

    const input = screen.getByLabelText(/Địa chỉ email tài khoản/i);
    await user.type(input, "student@toeicpath.ai");
    const submitBtn = screen.getByRole("button", { name: /Gửi liên kết đặt lại mật khẩu/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(authService.forgotPassword).toHaveBeenCalledWith({
        email: "student@toeicpath.ai",
      });
      expect(screen.getByText("Kiểm tra hòm thư của bạn")).toBeInTheDocument();
      expect(screen.getByText("student@toeicpath.ai")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Gửi lại email sau/i })).toBeDisabled();
      expect(toast.success).toHaveBeenCalledWith("Yêu cầu đã được gửi!", expect.any(Object));
    });
  });

  it("handles 429 rate limit error gracefully", async () => {
    const user = userEvent.setup();
    vi.mocked(authService.forgotPassword).mockRejectedValueOnce({
      statusCode: 429,
      message: "Too many requests",
    });

    render(<ForgotPasswordPage />);

    const input = screen.getByLabelText(/Địa chỉ email tài khoản/i);
    await user.type(input, "student@toeicpath.ai");
    const submitBtn = screen.getByRole("button", { name: /Gửi liên kết đặt lại mật khẩu/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút."
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút."
      );
    });
  });
});
