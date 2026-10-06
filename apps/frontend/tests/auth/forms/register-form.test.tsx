import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RegisterPage from "@/app/(auth)/register/page";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
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

describe("RegisterPage Integration Tests", () => {
  const mockPush = vi.fn();
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as any);

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });
  });

  it("renders all registration form fields and controls", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("heading", { name: "Tạo tài khoản mới" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Họ và tên/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mục tiêu điểm TOEIC/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Xác nhận mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đăng ký tài khoản" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đăng nhập với Google/i })).toBeInTheDocument();
  });

  it("validates empty required fields on submit", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const submitBtn = screen.getByRole("button", { name: "Đăng ký tài khoản" });
    await user.click(submitBtn);

    expect(await screen.findByText("Họ và tên phải có ít nhất 2 ký tự")).toBeInTheDocument();
    expect(await screen.findByText("Vui lòng nhập địa chỉ email")).toBeInTheDocument();
    expect(await screen.findByText("Mật khẩu phải chứa ít nhất 8 ký tự")).toBeInTheDocument();
    expect(await screen.findByText("Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật")).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("validates password mismatch", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/Họ và tên/i), "Nguyen Van A");
    await user.type(screen.getByLabelText(/Email/i), "vana@example.com");
    await user.type(screen.getByLabelText(/^Mật khẩu/i), "Password123");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "DifferentPass456");
    await user.click(screen.getByRole("checkbox"));

    await user.click(screen.getByRole("button", { name: "Đăng ký tài khoản" }));

    expect(await screen.findByText("Mật khẩu xác nhận không trùng khớp")).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("submits valid registration and redirects to /dashboard", async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({
      id: "u2",
      email: "vana@example.com",
      fullName: "Nguyen Van A",
      role: "student",
      targetScore: 750,
      createdAt: "2026-01-01",
    });

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/Họ và tên/i), "Nguyen Van A");
    await user.type(screen.getByLabelText(/Email/i), "vana@example.com");
    await user.type(screen.getByLabelText(/^Mật khẩu/i), "Password123");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "Password123");
    await user.click(screen.getByRole("checkbox"));

    await user.click(screen.getByRole("button", { name: "Đăng ký tài khoản" }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        fullName: "Nguyen Van A",
        email: "vana@example.com",
        password: "Password123",
        targetScore: undefined,
      });
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
      expect(toast.success).toHaveBeenCalledWith(
        "Tạo tài khoản thành công! Chào mừng bạn đến với TOEIC Path AI."
      );
    });
  });

  it("handles registration API error (e.g. email already in use)", async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(
      new Error("Email này đã được sử dụng bởi tài khoản khác.")
    );

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/Họ và tên/i), "Nguyen Van A");
    await user.type(screen.getByLabelText(/Email/i), "existing@example.com");
    await user.type(screen.getByLabelText(/^Mật khẩu/i), "Password123");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "Password123");
    await user.click(screen.getByRole("checkbox"));

    await user.click(screen.getByRole("button", { name: "Đăng ký tài khoản" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Email này đã được sử dụng bởi tài khoản khác."
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Email này đã được sử dụng bởi tài khoản khác."
      );
    });
  });
});
