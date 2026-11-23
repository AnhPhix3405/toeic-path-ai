import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImportJobHistoryTable } from "@/features/questions/components/import/import-job-history-table";

const mockReplace = vi.fn();
const mockRefetch = vi.fn();
const mockUseImportJobs = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/questions/import",
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/hooks/use-questions-import", () => ({
  useImportJobs: (...args: unknown[]) => mockUseImportJobs(...args),
}));

describe("ImportJobHistoryTable (#1006 Pagination 10/20, #1007 Refresh, #1008 URL Sync, PMR 004 #6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockUseImportJobs.mockReturnValue({
      data: {
        items: [
          {
            id: "job-1",
            fileName: "toeic_part5_batch.xlsx",
            fileUrl: "https://storage.local/import.xlsx",
            fileType: "excel",
            status: "partially_completed",
            targetStatus: "draft",
            totalRows: 20,
            successCount: 18,
            errorCount: 2,
            createdGroupsCount: 0,
            errorDetails: [
              { row: 5, error: "Sai đáp án", code: "INVALID_CORRECT_ANSWER" },
            ],
            createdBy: "u-1",
            createdAt: "2026-11-23T08:00:00.000Z",
            updatedAt: "2026-11-23T08:01:00.000Z",
            completedAt: "2026-11-23T08:01:00.000Z",
          },
        ],
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2,
      },
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });
  });

  it("renders refresh button (#1007) and calls refetch when clicked", () => {
    render(<ImportJobHistoryTable onSelectJob={vi.fn()} />);

    const refreshBtn = screen.getByRole("button", { name: /Làm mới/i });
    expect(refreshBtn).toBeInTheDocument();

    fireEvent.click(refreshBtn);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("allows switching pagination page size between 10 and 20 (#1006) and syncs with URL (#1008)", () => {
    render(<ImportJobHistoryTable onSelectJob={vi.fn()} />);

    const limit10Btn = screen.getByRole("button", { name: "10 dòng" });
    const limit20Btn = screen.getByRole("button", { name: "20 dòng" });

    expect(limit10Btn).toBeInTheDocument();
    expect(limit20Btn).toBeInTheDocument();

    fireEvent.click(limit10Btn);
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("limit=10"),
      { scroll: false }
    );
  });

  it("opens job error details modal when clicking Xem chi tiết on a row", () => {
    const onSelectJob = vi.fn();
    render(<ImportJobHistoryTable onSelectJob={onSelectJob} />);

    expect(screen.getByText("toeic_part5_batch.xlsx")).toBeInTheDocument();
    const detailBtn = screen.getByRole("button", { name: /Xem chi tiết/i });
    fireEvent.click(detailBtn);
    expect(onSelectJob).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-1",
        fileName: "toeic_part5_batch.xlsx",
      })
    );
  });

  it("displays inline validation error when from date is greater than to date (PMR 004 #6)", () => {
    render(<ImportJobHistoryTable onSelectJob={vi.fn()} />);

    const fromInput = screen.getByLabelText(/Từ ngày/i);
    const toInput = screen.getByLabelText(/Đến ngày/i);

    fireEvent.change(fromInput, { target: { value: "2026-11-25" } });
    fireEvent.change(toInput, { target: { value: "2026-11-20" } });

    expect(
      screen.getByText(/Ngày bắt đầu không được lớn hơn ngày kết thúc/i)
    ).toBeInTheDocument();
  });
});
