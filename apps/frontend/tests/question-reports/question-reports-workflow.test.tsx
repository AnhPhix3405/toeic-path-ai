import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReportQuestionModal } from "@/features/question-reports/components/report-question-modal";
import { QuestionReportsQueueTable } from "@/features/question-reports/components/question-reports-queue-table";
import { ResolveReportDrawer } from "@/features/question-reports/components/resolve-report-drawer";
import { questionReportsService } from "@/services/question-reports.service";
import {
  AdminQuestionReportItem,
  QuestionReportDetail,
} from "@/types/question-report";

vi.mock("@/services/question-reports.service", () => ({
  questionReportsService: {
    createReport: vi.fn(),
    getMyReports: vi.fn(),
    getReportsForManagement: vi.fn(),
    getReportDetail: vi.fn(),
    resolveReport: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Sprint 7 Tasks 3 & 4 — Question Reports Modal & Moderation Queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Review Focus #3: ReportQuestionModal validates description >= 10 for other (#1009) and handles 409 ERR_DUPLICATE_OPEN_REPORT", async () => {
    vi.mocked(questionReportsService.createReport).mockRejectedValueOnce({
      statusCode: 409,
      errorCode: "ERR_DUPLICATE_OPEN_REPORT",
      message: "Bạn đã có một báo cáo đang chờ xử lý cho câu hỏi này",
    });

    renderWithQuery(
      <ReportQuestionModal
        isOpen={true}
        questionId="20000000-0000-4000-8000-000000000001"
        attemptId="50000000-0000-4000-8000-000000000001"
        questionLabel="Câu 1 - Part 5"
        onClose={vi.fn()}
      />
    );

    // Select 'other' with short description -> inline alert
    fireEvent.click(screen.getByRole("button", { name: "Lý do khác" }));
    fireEvent.change(screen.getByLabelText(/Mô tả chi tiết/i), {
      target: { value: "Ngắn" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gửi báo cáo/i }));

    expect(screen.getByRole("alert").textContent).toContain("tối thiểu 10 ký tự");
    expect(questionReportsService.createReport).not.toHaveBeenCalled();

    // Valid description -> hits 409 conflict banner
    fireEvent.change(screen.getByLabelText(/Mô tả chi tiết/i), {
      target: { value: "Đáp án đúng cần được kiểm tra lại theo ngữ pháp." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gửi báo cáo/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Bạn đã có một báo cáo đang chờ xử lý"
      );
    });
  });

  it("Review Focus #5: QuestionReportsQueueTable renders RP/Q CodeBadges and ResolveReportDrawer enforces state machine + bulk resolve", async () => {
    const queueItems: AdminQuestionReportItem[] = [
      {
        id: "70000000-0000-4000-8000-000000000001",
        reportCode: "RP-00001",
        questionId: "20000000-0000-4000-8000-000000000001",
        questionCode: "Q-00001",
        reporterId: "30000000-0000-4000-8000-000000000001",
        reporterEmail: "student@example.com",
        attemptId: "50000000-0000-4000-8000-000000000001",
        partNumber: 1,
        questionContent: null,
        reason: "wrong_answer",
        description: "Đáp án đúng phải là B",
        status: "in_review",
        resolvedById: null,
        resolutionNote: null,
        createdAt: "2026-11-24T08:00:00.000Z",
        updatedAt: "2026-11-24T08:05:00.000Z",
        resolvedAt: null,
      },
    ];

    render(
      <QuestionReportsQueueTable
        items={queueItems}
        total={1}
        page={1}
        limit={10}
        onRefresh={vi.fn()}
        onStatusChange={vi.fn()}
        onReasonChange={vi.fn()}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
        onResetFilters={vi.fn()}
        onInspectReport={vi.fn()}
      />
    );

    expect(screen.getByText("RP-00001")).toBeTruthy();
    expect(screen.getByText("Q-00001")).toBeTruthy();

    // Now verify ResolveReportDrawer for status = 'in_review' (PMR 033 #3: hides in_review option)
    const detail: QuestionReportDetail = {
      id: "70000000-0000-4000-8000-000000000001",
      reportCode: "RP-00001",
      questionId: "20000000-0000-4000-8000-000000000001",
      questionCode: "Q-00001",
      reporterId: "30000000-0000-4000-8000-000000000001",
      reporterEmail: "student@example.com",
      attemptId: null,
      reason: "wrong_answer",
      description: "Đáp án đúng phải là B",
      status: "in_review",
      resolvedById: null,
      resolvedByEmail: null,
      resolvedAt: null,
      resolutionNote: null,
      createdAt: "2026-11-24T08:00:00.000Z",
      updatedAt: "2026-11-24T08:05:00.000Z",
      question: {
        id: "20000000-0000-4000-8000-000000000001",
        questionCode: "Q-00001",
        partNumber: 1,
        questionType: "single_choice",
        status: "published",
        content: null,
        explanation: null,
        audioUrl: null,
        imageUrl: null,
        options: [
          { id: "o1", label: "A", content: null, isCorrect: true, position: 1 },
        ],
        questionGroup: null,
      },
    };

    vi.mocked(questionReportsService.getReportDetail).mockResolvedValueOnce(
      detail
    );
    vi.mocked(questionReportsService.resolveReport).mockResolvedValueOnce({
      id: detail.id,
      questionId: detail.questionId,
      status: "resolved",
      resolvedById: "teacher-1",
      resolvedAt: "2026-11-24T09:00:00.000Z",
      resolutionNote: "Đã cập nhật lại đáp án chính xác cho câu hỏi.",
      bulkResolvedCount: 2,
    });

    renderWithQuery(
      <ResolveReportDrawer reportId={detail.id} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText(/Mở trang sửa câu hỏi/i)).toBeTruthy();
    });

    // Link uses pretty Q-00001 code
    expect(
      screen.getByRole("link", { name: /Mở trang sửa câu hỏi/i }).getAttribute("href")
    ).toBe("/questions/Q-00001/edit");

    // PMR 033 #3: `in_review` option must NOT be rendered when already in_review
    expect(
      screen.queryByRole("button", { name: /Đang kiểm tra \(in_review\)/i })
    ).toBeNull();

    // Validation #1009 blocks short note
    fireEvent.click(screen.getByRole("button", { name: /Lưu kết quả xử lý/i }));
    expect(screen.getByRole("alert").textContent).toContain("ít nhất 10 ký tự");

    // Valid note + bulk resolve checkbox
    fireEvent.change(screen.getByLabelText(/Ghi chú phản hồi xử lý/i), {
      target: { value: "Đã cập nhật lại đáp án chính xác cho câu hỏi." },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Lưu kết quả xử lý/i }));

    await waitFor(() => {
      expect(questionReportsService.resolveReport).toHaveBeenCalledWith(
        detail.id,
        {
          status: "resolved",
          resolutionNote: "Đã cập nhật lại đáp án chính xác cho câu hỏi.",
          resolveAllForQuestion: true,
        }
      );
    });
  });
});
