import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChangePasswordForm } from "@/features/settings/components/change-password-form";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "sonner";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ChangePasswordForm Component", () => {
  const mockChangePassword = vi.fn();

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
      changePassword: mockChangePassword,
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

  it("renders all form fields, labels and buttons", () => {
    render(<ChangePasswordForm />);

    expect(screen.getByRole("heading", { name: "Đổi Mật Khẩu" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu hiện tại/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu mới/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Xác nhận mật khẩu mới/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đổi mật khẩu/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hủy bỏ/i })).toBeInTheDocument();
  });

  it("disables Submit and Cancel buttons when form is pristine (not dirty)", () => {
    render(<ChangePasswordForm />);

    expect(screen.getByRole("button", { name: /Đổi mật khẩu/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Hủy bỏ/i })).toBeDisabled();
  });

  it("enables buttons on typing and resets fields when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    const currentPwdInput = screen.getByLabelText(/Mật khẩu hiện tại/i);
    await user.type(currentPwdInput, "OldPassword123!");

    const submitBtn = screen.getByRole("button", { name: /Đổi mật khẩu/i });
    const cancelBtn = screen.getByRole("button", { name: /Hủy bỏ/i });

    expect(submitBtn).not.toBeDisabled();
    expect(cancelBtn).not.toBeDisabled();

    await user.click(cancelBtn);

    expect(currentPwdInput).toHaveValue("");
    expect(submitBtn).toBeDisabled();
  });

  it("shows validation errors when submitting with invalid password criteria", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    const currentPwdInput = screen.getByLabelText(/Mật khẩu hiện tại/i);
    const newPwdInput = screen.getByLabelText(/^Mật khẩu mới/i);
    const confirmPwdInput = screen.getByLabelText(/Xác nhận mật khẩu mới/i);
    const submitBtn = screen.getByRole("button", { name: /Đổi mật khẩu/i });

    await user.type(currentPwdInput, "OldPassword123!");
    await user.type(newPwdInput, "short1!");
    await user.type(confirmPwdInput, "mismatch2!");
    await user.click(submitBtn);

    expect(await screen.findByText("Mật khẩu mới phải chứa ít nhất 12 ký tự")).toBeInTheDocument();
    expect(await screen.findByText("Mật khẩu xác nhận không trùng khớp")).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("submits valid passwords and shows success message", async () => {
    const user = userEvent.setup();
    mockChangePassword.mockResolvedValueOnce({
      message: "Password has been changed successfully.",
    });

    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText(/Mật khẩu hiện tại/i), "OldPassword123!");
    await user.type(screen.getByLabelText(/^Mật khẩu mới/i), "NewSecurePassword456!@");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu mới/i), "NewSecurePassword456!@");
    await user.click(screen.getByRole("button", { name: /Đổi mật khẩu/i }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: "OldPassword123!",
        newPassword: "NewSecurePassword456!@",
        confirmNewPassword: "NewSecurePassword456!@",
      });
      expect(screen.getByRole("status")).toHaveTextContent("Password has been changed successfully.");
    });
  });

  it("displays translated server error alert when current password is incorrect", async () => {
    const user = userEvent.setup();
    mockChangePassword.mockRejectedValueOnce({
      statusCode: 400,
      message: "Current password is incorrect",
    });

    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText(/Mật khẩu hiện tại/i), "WrongPassword123!");
    await user.type(screen.getByLabelText(/^Mật khẩu mới/i), "NewSecurePassword456!@");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu mới/i), "NewSecurePassword456!@");
    await user.click(screen.getByRole("button", { name: /Đổi mật khẩu/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Mật khẩu hiện tại không chính xác");
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("displays server error alert when new password is the same as current password", async () => {
    const user = userEvent.setup();
    mockChangePassword.mockRejectedValueOnce({
      statusCode: 400,
      message: "New password cannot be the same as your current password",
    });

    render(<ChangePasswordForm />);

    // Type same password
    await user.type(screen.getByLabelText(/Mật khẩu hiện tại/i), "SamePassword123!@");
    await user.type(screen.getByLabelText(/^Mật khẩu mới/i), "SamePassword123!@");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu mới/i), "SamePassword123!@");
    await user.click(screen.getByRole("button", { name: /Đổi mật khẩu/i }));

    // Client-side schema catches it first!
    expect(await screen.findByText(/không được trùng/i)).toBeInTheDocument();
  });

  it("renders OAuth banner when isOAuthUser is true", () => {
    render(<ChangePasswordForm isOAuthUser />);

    expect(screen.getByText("Tài khoản liên kết Google")).toBeInTheDocument();
    expect(screen.getByText(/Google OAuth/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mật khẩu hiện tại/i)).not.toBeInTheDocument();
  });
});
