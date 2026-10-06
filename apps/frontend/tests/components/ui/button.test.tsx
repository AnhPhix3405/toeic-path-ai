import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button Component", () => {
  it("renders with default props and text content", () => {
    render(<Button>Bắt đầu làm bài</Button>);
    const button = screen.getByRole("button", { name: /bắt đầu làm bài/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-primary");
  });

  it("applies variant and size classes correctly", () => {
    const { rerender } = render(
      <Button variant="destructive" size="sm">
        Xóa câu hỏi
      </Button>
    );
    let button = screen.getByRole("button", { name: /xóa câu hỏi/i });
    expect(button).toHaveClass("bg-destructive");
    expect(button).toHaveClass("h-8");

    rerender(
      <Button variant="outline" size="lg">
        Lưu nháp
      </Button>
    );
    button = screen.getByRole("button", { name: /lưu nháp/i });
    expect(button).toHaveClass("border-input");
    expect(button).toHaveClass("h-10");
  });

  it("handles click events properly", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Nộp bài</Button>);
    const button = screen.getByRole("button", { name: /nộp bài/i });

    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("prevents clicks and has disabled attribute when disabled is true", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        Không thể bấm
      </Button>
    );
    const button = screen.getByRole("button", { name: /không thể bấm/i });

    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50");

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("displays loading spinner and is disabled when isLoading is true", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button isLoading onClick={handleClick}>
        Đang xử lý
      </Button>
    );
    const button = screen.getByRole("button", { name: /đang xử lý/i });

    expect(button).toBeDisabled();
    const spinner = button.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders as child element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/dashboard">Vào Dashboard</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: /vào dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link).toHaveClass("bg-primary");
  });
});
