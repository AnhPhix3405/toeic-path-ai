import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "@/services/api-client";
import { questionReportsService } from "@/services/question-reports.service";
import {
  createQuestionReportSchema,
  resolveQuestionReportSchema,
} from "@/lib/validations/question-report.schema";
import { attemptHistoryFilterSchema } from "@/lib/validations/exam-attempt.schema";

vi.mock("@/services/api-client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Sprint 7 Task 1 — Question Reports Service & Validation Schemas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createQuestionReportSchema enforces >= 10 chars description when reason is other (#1009)", () => {
    const invalid = createQuestionReportSchema.safeParse({
      reason: "other",
      description: "Quá ngắn",
    });
    expect(invalid.success).toBe(false);

    const validOther = createQuestionReportSchema.safeParse({
      reason: "other",
      description: "Mô tả chi tiết lỗi câu hỏi trên 10 ký tự.",
    });
    expect(validOther.success).toBe(true);

    const validWrongAnswer = createQuestionReportSchema.safeParse({
      reason: "wrong_answer",
    });
    expect(validWrongAnswer.success).toBe(true);
  });

  it("resolveQuestionReportSchema enforces >= 10 chars resolutionNote for resolved/rejected but allows empty for in_review (#1009)", () => {
    expect(
      resolveQuestionReportSchema.safeParse({
        status: "resolved",
        resolutionNote: "Ngắn",
      }).success
    ).toBe(false);

    expect(
      resolveQuestionReportSchema.safeParse({
        status: "rejected",
        resolutionNote: "",
      }).success
    ).toBe(false);

    expect(
      resolveQuestionReportSchema.safeParse({
        status: "in_review",
      }).success
    ).toBe(true);

    expect(
      resolveQuestionReportSchema.safeParse({
        status: "resolved",
        resolutionNote: "Đã kiểm tra lại đáp án và xác nhận cập nhật thành công.",
        resolveAllForQuestion: true,
      }).success
    ).toBe(true);
  });

  it("attemptHistoryFilterSchema rejects fromDate > toDate (#1009)", () => {
    expect(
      attemptHistoryFilterSchema.safeParse({
        fromDate: "2026-11-20",
        toDate: "2026-11-10",
      }).success
    ).toBe(false);

    expect(
      attemptHistoryFilterSchema.safeParse({
        fromDate: "2026-11-10",
        toDate: "2026-11-20",
      }).success
    ).toBe(true);
  });

  it("questionReportsService calls exact Backend Sprint 7 endpoints (#222)", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ id: "rep-1" } as never);
    await questionReportsService.createReport("q-uuid", {
      reason: "wrong_answer",
      attemptId: "att-uuid",
    });
    expect(apiClient.post).toHaveBeenCalledWith("/questions/q-uuid/reports", {
      reason: "wrong_answer",
      attemptId: "att-uuid",
    });

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    } as never);
    await questionReportsService.getMyReports({ page: 1, limit: 10 });
    expect(apiClient.get).toHaveBeenCalledWith("/question-reports/my", {
      params: { page: 1, limit: 10 },
    });

    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      id: "rep-1",
      bulkResolvedCount: 2,
    } as never);
    await questionReportsService.resolveReport("rep-1", {
      status: "resolved",
      resolutionNote: "Đã sửa lại đáp án chính xác.",
      resolveAllForQuestion: true,
    });
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/question-reports/rep-1/resolve",
      {
        status: "resolved",
        resolutionNote: "Đã sửa lại đáp án chính xác.",
        resolveAllForQuestion: true,
      }
    );
  });
});
