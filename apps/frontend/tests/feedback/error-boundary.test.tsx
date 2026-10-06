import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "@/components/feedback/error-boundary";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Sự cố giả lập từ component con!");
  }
  return <div>Nội dung an toàn</div>;
}

describe("ErrorBoundary Component", () => {
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = vi.fn(); // Suppress React boundary error logs in test output
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("renders children normally when there is no runtime error", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Nội dung an toàn")).toBeInTheDocument();
  });

  it("catches runtime errors and renders default fallback UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Thành phần gặp sự cố khi hiển thị")).toBeInTheDocument();
    expect(screen.getByText("Sự cố giả lập từ component con!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /thử tải lại/i })).toBeInTheDocument();
  });

  it("calls onError callback when error is caught", () => {
    const handleError = vi.fn();

    render(
      <ErrorBoundary onError={handleError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(handleError).toHaveBeenCalled();
  });

  it("supports custom function fallback and reset button", async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();

    render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <div>
            <p>Tùy biến lỗi: {error.message}</p>
            <button onClick={() => { handleReset(); reset(); }}>Thử lại ngay</button>
          </div>
        )}
      >
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Tùy biến lỗi: Sự cố giả lập từ component con!")).toBeInTheDocument();

    const resetBtn = screen.getByRole("button", { name: /thử lại ngay/i });
    await user.click(resetBtn);

    expect(handleReset).toHaveBeenCalled();
  });
});
