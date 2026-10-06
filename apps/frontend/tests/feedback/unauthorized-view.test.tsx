import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UnauthorizedView } from "@/components/feedback/unauthorized-view";

describe("UnauthorizedView Component", () => {
  it("renders with default props and links", () => {
    render(<UnauthorizedView />);

    expect(screen.getByRole("heading", { name: /quyền truy cập bị từ chối/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Bạn không có quyền hạn cần thiết để truy cập vào khu vực này/i)
    ).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: /quay lại trang chủ/i });
    expect(backLink).toHaveAttribute("href", "/dashboard");

    const loginLink = screen.getByRole("link", { name: /đăng nhập tài khoản khác/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("renders custom titles, descriptions and target hrefs", () => {
    render(
      <UnauthorizedView
        title="403 — Cấm truy cập khu vực Quản trị"
        description="Chỉ tài khoản Admin mới có thể quản lý hệ thống."
        backHref="/teacher-dashboard"
        loginHref="/auth/login"
      />
    );

    expect(
      screen.getByRole("heading", { name: /403 — Cấm truy cập khu vực Quản trị/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Chỉ tài khoản Admin mới có thể quản lý hệ thống.")
    ).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: /quay lại trang chủ/i });
    expect(backLink).toHaveAttribute("href", "/teacher-dashboard");

    const loginLink = screen.getByRole("link", { name: /đăng nhập tài khoản khác/i });
    expect(loginLink).toHaveAttribute("href", "/auth/login");
  });

  it("hides login button when showLoginButton is false", () => {
    render(<UnauthorizedView showLoginButton={false} />);

    expect(
      screen.queryByRole("link", { name: /đăng nhập tài khoản khác/i })
    ).not.toBeInTheDocument();
  });
});
