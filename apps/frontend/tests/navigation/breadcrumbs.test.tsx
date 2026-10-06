import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("Breadcrumbs Component", () => {
  it("renders nothing when on root path '/'", () => {
    mockUsePathname.mockReturnValue("/");
    const { container } = render(<Breadcrumbs />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders breadcrumbs accurately for a single level path '/dashboard'", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Breadcrumbs />);

    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();

    // Home link
    const homeLink = screen.getByTitle("Trang chủ");
    expect(homeLink).toHaveAttribute("href", "/");

    // Current page
    const currentPage = screen.getByText("Tổng quan");
    expect(currentPage).toHaveAttribute("aria-current", "page");
  });

  it("renders multi-level breadcrumbs for nested paths '/teacher/questions'", () => {
    mockUsePathname.mockReturnValue("/teacher/questions");
    render(<Breadcrumbs />);

    // Intermediate link
    const parentLink = screen.getByRole("link", { name: "Giảng viên" });
    expect(parentLink).toHaveAttribute("href", "/teacher");

    // Current page
    const currentPage = screen.getByText("Ngân hàng câu hỏi");
    expect(currentPage).toHaveAttribute("aria-current", "page");
  });
});
