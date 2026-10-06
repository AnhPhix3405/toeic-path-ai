import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

describe("Input Component", () => {
  it("renders text input and accepts typing", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Input
        placeholder="Nhập email của bạn"
        onChange={handleChange}
        data-testid="test-input"
      />
    );

    const input = screen.getByPlaceholderText("Nhập email của bạn");
    expect(input).toBeInTheDocument();

    await user.type(input, "student@toeicpath.ai");
    expect(input).toHaveValue("student@toeicpath.ai");
    expect(handleChange).toHaveBeenCalled();
  });

  it("applies error styling and aria-invalid when error is true", () => {
    render(<Input error placeholder="Email lỗi" />);
    const input = screen.getByPlaceholderText("Email lỗi");
    expect(input).toHaveClass("border-destructive");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("respects disabled state", async () => {
    const user = userEvent.setup();
    render(<Input disabled placeholder="Không thể nhập" />);
    const input = screen.getByPlaceholderText("Không thể nhập");
    expect(input).toBeDisabled();

    await user.type(input, "abc");
    expect(input).toHaveValue("");
  });
});

describe("Textarea Component", () => {
  it("renders multiline textarea and accepts input", async () => {
    const user = userEvent.setup();
    render(<Textarea placeholder="Nhập lời giải thích chi tiết" />);
    const textarea = screen.getByPlaceholderText("Nhập lời giải thích chi tiết");

    await user.type(textarea, "Đáp án đúng là A vì...\nCấu trúc câu điều kiện.");
    expect(textarea).toHaveValue("Đáp án đúng là A vì...\nCấu trúc câu điều kiện.");
  });

  it("applies error styling and aria-invalid when error is true", () => {
    render(<Textarea error placeholder="Giải thích lỗi" />);
    const textarea = screen.getByPlaceholderText("Giải thích lỗi");
    expect(textarea).toHaveClass("border-destructive");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Checkbox Component", () => {
  it("toggles checked state upon user click", async () => {
    const user = userEvent.setup();
    const handleCheckedChange = vi.fn();

    render(
      <label className="flex items-center gap-2">
        <Checkbox
          id="terms"
          onCheckedChange={handleCheckedChange}
          aria-label="Đồng ý điều khoản"
        />
        <span>Đồng ý điều khoản sử dụng</span>
      </label>
    );

    const checkbox = screen.getByRole("checkbox", { name: /đồng ý điều khoản/i });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(handleCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not trigger change when disabled", async () => {
    const user = userEvent.setup();
    const handleCheckedChange = vi.fn();

    render(
      <Checkbox
        disabled
        onCheckedChange={handleCheckedChange}
        aria-label="Checkbox khóa"
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /checkbox khóa/i });
    expect(checkbox).toBeDisabled();

    await user.click(checkbox);
    expect(handleCheckedChange).not.toHaveBeenCalled();
  });
});

describe("RadioGroup Component", () => {
  it("allows selecting radio options within a group", async () => {
    const user = userEvent.setup();
    const handleValueChange = vi.fn();

    render(
      <RadioGroup defaultValue="A" onValueChange={handleValueChange}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="A" id="opt-A" aria-label="Đáp án A" />
          <label htmlFor="opt-A">A. In addition to</label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="B" id="opt-B" aria-label="Đáp án B" />
          <label htmlFor="opt-B">B. Therefore</label>
        </div>
      </RadioGroup>
    );

    const radioA = screen.getByRole("radio", { name: /đáp án a/i });
    const radioB = screen.getByRole("radio", { name: /đáp án b/i });

    expect(radioA).toBeChecked();
    expect(radioB).not.toBeChecked();

    await user.click(radioB);
    expect(handleValueChange).toHaveBeenCalledWith("B");
  });
});
