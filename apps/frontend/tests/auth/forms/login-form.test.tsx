import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "@/app/(auth)/login/page";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
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

describe("LoginPage Integration Tests", () => {
  const mockPush = vi.fn();
  const mockLogin = vi.fn();

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

    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>);

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      login: mockLogin,
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });
  });

  it("renders all login form controls and headings", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Chào mừng trở lại" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Ghi nhớ đăng nhập/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đăng nhập với Google/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Quên mật khẩu\?/i })).toHaveAttribute("href", "/forgot-password");
  });

  it("shows validation errors when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const submitBtn = screen.getByRole("button", { name: "Đăng nhập" });
    await user.click(submitBtn);

    expect(await screen.findByText("Vui lòng nhập địa chỉ email")).toBeInTheDocument();
    expect(await screen.findByText("Mật khẩu phải chứa ít nhất 6 ký tự")).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid email format", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/^Mật khẩu/i);
    const submitBtn = screen.getByRole("button", { name: "Đăng nhập" });

    await user.type(emailInput, "not-an-email");
    await user.type(passwordInput, "password123");
    await user.click(submitBtn);

    expect(await screen.findByText("Địa chỉ email không hợp lệ")).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("submits valid credentials and redirects student to /dashboard", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      id: "u1",
      email: "student@example.com",
      fullName: "Student One",
      role: "student",
      createdAt: "2026-01-01",
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/^Mật khẩu/i);
    const submitBtn = screen.getByRole("button", { name: "Đăng nhập" });

    await user.type(emailInput, "student@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "student@example.com",
        password: "password123",
      });
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
      expect(toast.success).toHaveBeenCalledWith("Đăng nhập thành công!");
    });
  });

  it("redirects admin to /admin-dashboard upon login", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      id: "admin1",
      email: "admin@toeicpath.ai",
      fullName: "System Admin",
      role: "admin",
      createdAt: "2026-01-01",
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/Email/i), "admin@toeicpath.ai");
    await user.type(screen.getByLabelText(/^Mật khẩu/i), "password123");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin-dashboard");
    });
  });

  it("redirects teacher to /teacher-dashboard upon login", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      id: "t1",
      email: "teacher@toeicpath.ai",
      fullName: "Teacher John",
      role: "teacher",
      createdAt: "2026-01-01",
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/Email/i), "teacher@toeicpath.ai");
    await user.type(screen.getByLabelText(/^Mật khẩu/i), "password123");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/teacher-dashboard");
    });
  });

  it("honors redirect query parameter when present", async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("redirect=/practice/exam-1") as unknown as ReturnType<typeof useSearchParams>
    );

    mockLogin.mockResolvedValueOnce({
      id: "u1",
      email: "student@example.com",
      fullName: "Student One",
      role: "student",
      createdAt: "2026-01-01",
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/Email/i), "student@example.com");
    await user.type(screen.getByLabelText(/^Mật khẩu/i), "password123");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/practice/exam-1");
    });
  });

  it("displays error alert when login fails", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(
      new Error("Email hoặc mật khẩu không chính xác.")
    );

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/Email/i), "student@example.com");
    await user.type(screen.getByLabelText(/^Mật khẩu/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Email hoặc mật khẩu không chính xác.");
      expect(toast.error).toHaveBeenCalledWith("Email hoặc mật khẩu không chính xác.");
    });
  });
});
