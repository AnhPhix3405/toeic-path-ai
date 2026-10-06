import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import {
  PasswordInput,
  calculatePasswordStrength,
} from "@/components/auth/password-input";

describe("calculatePasswordStrength helper", () => {
  it("returns score 0 for empty password", () => {
    expect(calculatePasswordStrength("")).toEqual({
      score: 0,
      label: "",
      color: "bg-muted",
    });
  });

  it("returns score 1 (Yếu) for simple short password", () => {
    const result = calculatePasswordStrength("abc");
    expect(result.score).toBe(1);
    expect(result.label).toBe("Yếu");
  });

  it("returns score 2 (Trung bình) for 8+ chars with digits", () => {
    const result = calculatePasswordStrength("password123");
    expect(result.score).toBe(2);
    expect(result.label).toBe("Trung bình");
  });

  it("returns score 3 (Khá) for 8+ chars with digits and uppercase", () => {
    const result = calculatePasswordStrength("Password123");
    expect(result.score).toBe(3);
    expect(result.label).toBe("Khá");
  });

  it("returns score 4 (Rất mạnh) for 8+ chars with uppercase, digits, and special characters", () => {
    const result = calculatePasswordStrength("Password123!@#");
    expect(result.score).toBe(4);
    expect(result.label).toBe("Rất mạnh");
  });
});

describe("PasswordInput Component", () => {
  it("renders with type password by default", () => {
    render(<PasswordInput placeholder="Nhập mật khẩu" />);
    const input = screen.getByPlaceholderText("Nhập mật khẩu");
    expect(input).toHaveAttribute("type", "password");
  });

  it("toggles password visibility when the eye button is clicked", async () => {
    const user = userEvent.setup();
    render(<PasswordInput placeholder="Nhập mật khẩu" />);
    const input = screen.getByPlaceholderText("Nhập mật khẩu");
    const toggleButton = screen.getByRole("button", { name: /Hiện mật khẩu/i });

    expect(input).toHaveAttribute("type", "password");

    await user.click(toggleButton);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /Ẩn mật khẩu/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Ẩn mật khẩu/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("does not render strength meter by default", () => {
    render(<PasswordInput placeholder="Nhập mật khẩu" value="Secret123!" onChange={() => {}} />);
    expect(screen.queryByTestId("password-strength-meter")).not.toBeInTheDocument();
  });

  it("renders strength meter when showStrengthMeter is true and value is provided", () => {
    render(
      <PasswordInput
        placeholder="Nhập mật khẩu"
        showStrengthMeter
        value="Password123!"
        onChange={() => {}}
      />
    );
    expect(screen.getByTestId("password-strength-meter")).toBeInTheDocument();
    expect(screen.getByText("Độ mạnh mật khẩu:")).toBeInTheDocument();
    expect(screen.getByText("Rất mạnh")).toBeInTheDocument();
  });

  it("updates strength meter dynamically on user input", async () => {
    render(<PasswordInput placeholder="Nhập mật khẩu" showStrengthMeter />);
    const input = screen.getByPlaceholderText("Nhập mật khẩu");

    fireEvent.change(input, { target: { value: "weak" } });
    expect(screen.getByTestId("password-strength-meter")).toBeInTheDocument();
    expect(screen.getByText("Yếu")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "StrongP@ssw0rd!" } });
    expect(screen.getByText("Rất mạnh")).toBeInTheDocument();
  });
});
