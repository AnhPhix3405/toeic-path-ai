import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ImportProgressModal } from "@/features/questions/components/import/import-progress-modal";

const mockUseImportJobPolling = vi.fn();

vi.mock("@/hooks/use-questions-import", () => ({
  useImportJobPolling: (...args: unknown[]) => mockUseImportJobPolling(...args),
}));

describe("ImportProgressModal (Sync & Async Polling Tracker)", () => {
  it("displays immediate summary and error details for Sync response (isAsync: false) without polling", () => {
    mockUseImportJobPolling.mockReturnValue({ data: undefined, isFetching: false });
    const onDownloadErrorCsv = vi.fn();

    render(
      <ImportProgressModal
        open={true}
        onOpenChange={vi.fn()}
        onDownloadErrorCsv={onDownloadErrorCsv}
        initialResult={{
          jobId: "sync-job-1",
          isAsync: false,
          status: "partially_completed",
          totalRows: 10,
          successCount: 7,
          errorCount: 3,
          createdGroupsCount: 2,
          errorDetails: [
            {
              row: 4,
              code: "GROUP_ROLLBACK",
              error: "Câu hỏi trong nhóm bị hủy bỏ do nhóm có câu hỏi con bị lỗi.",
            },
          ],
        }}
      />
    );

    expect(screen.getByText(/Hoàn tất một phần/i)).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/GROUP_ROLLBACK/i)).toBeInTheDocument();

    const downloadBtn = screen.getByRole("button", { name: /Tải log lỗi \(CSV\)/i });
    fireEvent.click(downloadBtn);
    expect(onDownloadErrorCsv).toHaveBeenCalledTimes(1);
  });

  it("polls and displays real-time progress when initialResult is Async (isAsync: true)", () => {
    mockUseImportJobPolling.mockReturnValue({
      data: {
        id: "async-job-99",
        fileName: "big_batch.xlsx",
        fileUrl: null,
        fileType: "excel",
        status: "processing",
        targetStatus: "draft",
        totalRows: 250,
        successCount: 125,
        errorCount: 0,
        createdGroupsCount: 15,
        errorDetails: null,
        createdBy: "u-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      },
      isFetching: true,
    });

    render(
      <ImportProgressModal
        open={true}
        onOpenChange={vi.fn()}
        initialResult={{
          jobId: "async-job-99",
          isAsync: true,
          status: "processing",
          totalRows: 250,
          message: "Tệp lớn đã được tiếp nhận và đang được xử lý bất đồng bộ qua hàng đợi.",
        }}
      />
    );

    expect(mockUseImportJobPolling).toHaveBeenCalledWith("async-job-99", true);
    expect(screen.getByText(/Đang xử lý bất đồng bộ/i)).toBeInTheDocument();
    expect(screen.getByText(/50%/i)).toBeInTheDocument();
  });
});
