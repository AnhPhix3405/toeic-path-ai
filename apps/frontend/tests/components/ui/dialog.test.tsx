import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

describe("Dialog Component", () => {
  it("opens and displays modal content when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Mở xác nhận nộp bài</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận nộp bài thi</DialogTitle>
            <DialogDescription>
              Bạn còn 15 phút và 5 câu chưa điền. Bạn có chắc chắn muốn nộp?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline">Tiếp tục làm bài</Button>
            <Button>Nộp bài ngay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    // Initial state: dialog is closed
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click trigger to open
    const trigger = screen.getByRole("button", { name: /mở xác nhận nộp bài/i });
    await user.click(trigger);

    // Dialog should now be open with accessible roles and labels
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Xác nhận nộp bài thi")).toBeInTheDocument();
    expect(
      screen.getByText(/Bạn còn 15 phút và 5 câu chưa điền/i)
    ).toBeInTheDocument();
  });

  it("closes dialog when pressing Escape key", async () => {
    const user = userEvent.setup();

    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thông báo quan trọng</DialogTitle>
            <DialogDescription>Nội dung chi tiết thông báo.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
