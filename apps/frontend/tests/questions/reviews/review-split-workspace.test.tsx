import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReviewSplitWorkspace } from "@/features/questions/components/reviews/review-split-workspace";
import { Question } from "@/types/question";

const mockApprove = vi.fn();
const mockQuickFix = vi.fn();
const mockRequestRevision = vi.fn();
const mockReject = vi.fn();

vi.mock("@/hooks/use-question-reviews", () => ({
  useApproveQuestion: () => ({ mutateAsync: mockApprove, isPending: false }),
  useQuickFixApprove: () => ({ mutateAsync: mockQuickFix, isPending: false }),
  useRequestRevision: () => ({
    mutateAsync: mockRequestRevision,
    isPending: false,
  }),
  useRejectQuestion: () => ({ mutateAsync: mockReject, isPending: false }),
  useQuestionHistories: () => ({ data: [], isLoading: false }),
  useQuestionReviewLogs: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/use-media", () => ({
  useQuestionMedia: () => ({ data: [], isLoading: false }),
  useQuestionGroupMedia: () => ({ data: [], isLoading: false }),
}));

const samplePendingQuestion: Question = {
  id: "q-review-1",
  content: "Ms. Tanaka _____ the quarterly financial report.",
  questionType: "single_choice",
  status: "pending_review",
  version: 3,
  createdBy: "creator-1",
  creator: {
    id: "creator-1",
    fullName: "Giáo viên Soạn Bài",
    email: "creator@toeic.ai",
  },
  questionGroupId: "grp-1",
  questionGroup: {
    id: "grp-1",
    title: "Notice Memo",
    context: "Questions 131-134 refer to the following memo.",
  },
  groupOrder: 1,
  explanation: "Past tense verb needed.",
  options: [
    {
      id: "opt-a",
      label: "A",
      content: "prepared",
      isCorrect: true,
      position: 1,
    },
    {
      id: "opt-b",
      label: "B",
      content: "preparing",
      isCorrect: false,
      position: 2,
    },
    {
      id: "opt-c",
      label: "C",
      content: "preparation",
      isCorrect: false,
      position: 3,
    },
    {
      id: "opt-d",
      label: "D",
      content: "preparatory",
      isCorrect: false,
      position: 4,
    },
  ],
  part: {
    id: "p5",
    partNumber: 5,
    name: "Incomplete Sentences",
    description: null,
  },
  difficulty: "medium",
  topics: [],
  skills: [],
  createdAt: "2026-11-23T08:00:00.000Z",
  updatedAt: "2026-11-23T08:00:00.000Z",
};

describe("ReviewSplitWorkspace (Maker-Checker, Admin Bypass, Quick-Fix, Revision & 409 Conflict)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Review Focus 1a: blocks approval actions when currentUser is the creator (Maker-Checker Rule for Teacher)", () => {
    render(
      <ReviewSplitWorkspace
        question={samplePendingQuestion}
        currentUserId="creator-1"
        currentUserRole="teacher"
        onClose={vi.fn()}
        onReviewCompleted={vi.fn()}
        onReloadQuestion={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        /Bạn là người biên soạn câu hỏi này nên không thể tự kiểm duyệt/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Phê duyệt ngay/i })
    ).toBeDisabled();
  });

  it("Review Focus 1b: allows Admin to toggle emergencyBypass with audit warning and approve self-created question", async () => {
    mockApprove.mockResolvedValueOnce({
      id: "q-review-1",
      status: "published",
      version: 4,
    });

    render(
      <ReviewSplitWorkspace
        question={samplePendingQuestion}
        currentUserId="creator-1"
        currentUserRole="admin"
        onClose={vi.fn()}
        onReviewCompleted={vi.fn()}
        onReloadQuestion={vi.fn()}
      />
    );

    const approveBtn = screen.getByRole("button", { name: /Phê duyệt ngay/i });
    expect(approveBtn).toBeDisabled();

    const bypassCheckbox = screen.getByLabelText(
      /Kích hoạt quyền Admin Bypass khẩn cấp/i
    );
    fireEvent.click(bypassCheckbox);

    expect(screen.getByText(/ADMIN_REVIEW_BYPASS/i)).toBeInTheDocument();
    expect(approveBtn).not.toBeDisabled();

    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith({
        id: "q-review-1",
        dto: expect.objectContaining({
          version: 3,
          emergencyBypass: true,
        }),
      });
    });
  });

  it("Review Focus 2: enforces mandatory feedback (#1009) when requesting revision", async () => {
    render(
      <ReviewSplitWorkspace
        question={samplePendingQuestion}
        currentUserId="other-reviewer"
        currentUserRole="teacher"
        onClose={vi.fn()}
        onReviewCompleted={vi.fn()}
        onReloadQuestion={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Yêu cầu chỉnh sửa/i }));

    const confirmBtn = screen.getByRole("button", {
      name: /Gửi yêu cầu chỉnh sửa/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Vui lòng nhập nhận xét chi tiết và hướng dẫn chỉnh sửa/i
        )
      ).toBeInTheDocument();
    });
    expect(mockRequestRevision).not.toHaveBeenCalled();
  });

  it("Review Focus 3: opens Optimistic Locking Conflict Modal when API returns 409 Conflict", async () => {
    mockApprove.mockRejectedValueOnce({
      statusCode: 409,
      errorCode: "ERR_CONCURRENCY_CONFLICT",
      message: "Nội dung câu hỏi đã bị thay đổi bởi người dùng khác.",
    });
    const onReloadQuestion = vi.fn();

    render(
      <ReviewSplitWorkspace
        question={samplePendingQuestion}
        currentUserId="other-reviewer"
        currentUserRole="teacher"
        onClose={vi.fn()}
        onReviewCompleted={vi.fn()}
        onReloadQuestion={onReloadQuestion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Phê duyệt ngay/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Xung đột phiên bản dữ liệu \(Optimistic Locking\)/i)
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Tải lại dữ liệu mới nhất/i })
    );
    expect(onReloadQuestion).toHaveBeenCalledTimes(1);
  });
});
