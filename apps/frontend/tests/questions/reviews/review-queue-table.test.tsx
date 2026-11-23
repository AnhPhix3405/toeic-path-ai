import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReviewQueueFilters } from "@/features/questions/components/reviews/review-queue-filters";
import { ReviewQueueTable } from "@/features/questions/components/reviews/review-queue-table";
import { Question } from "@/types/question";

const mockBatchApprove = vi.fn();

vi.mock("@/hooks/use-classification", () => ({
  useToeicParts: () => ({
    data: [
      {
        id: "p5",
        partNumber: 5,
        name: "Incomplete Sentences",
        description: null,
      },
    ],
  }),
  useTopics: () => ({
    data: [{ id: "t1", name: "Business", description: null }],
  }),
}));

vi.mock("@/hooks/use-question-reviews", () => ({
  useBatchApproveQuestions: () => ({
    mutateAsync: mockBatchApprove,
    isPending: false,
  }),
}));

const sampleQueueQuestions: Question[] = [
  {
    id: "q-other-1",
    content: "Question created by another teacher",
    questionType: "single_choice",
    status: "pending_review",
    version: 2,
    createdBy: "teacher-other",
    creator: {
      id: "teacher-other",
      fullName: "Nguyễn Văn A",
      email: "a@toeic.ai",
    },
    groupOrder: null,
    explanation: "Explanation 1",
    options: [],
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
  },
  {
    id: "q-self-2",
    content: "Question created by current reviewer himself",
    questionType: "single_choice",
    status: "pending_review",
    version: 1,
    createdBy: "current-reviewer-id",
    creator: {
      id: "current-reviewer-id",
      fullName: "Tôi (Creator)",
      email: "me@toeic.ai",
    },
    groupOrder: null,
    explanation: "Explanation 2",
    options: [],
    part: {
      id: "p5",
      partNumber: 5,
      name: "Incomplete Sentences",
      description: null,
    },
    difficulty: "hard",
    topics: [],
    skills: [],
    createdAt: "2026-11-23T08:00:00.000Z",
    updatedAt: "2026-11-23T08:00:00.000Z",
  },
];

describe("ReviewQueueFilters & ReviewQueueTable (#1006, #1007, Maker-Checker Batch, PMR 005 #2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Refresh button (#1007) in ReviewQueueFilters and triggers onRefresh", () => {
    const onRefresh = vi.fn();
    render(
      <ReviewQueueFilters
        isFetching={false}
        onRefresh={onRefresh}
        filter={{
          page: 1,
          limit: 20,
          search: "",
          partId: "all",
          topicId: "all",
          creatorId: "",
          setPage: vi.fn(),
          setLimit: vi.fn(),
          setSearch: vi.fn(),
          setPartId: vi.fn(),
          setTopicId: vi.fn(),
          setCreatorId: vi.fn(),
          resetFilters: vi.fn(),
        }}
      />
    );

    const refreshBtn = screen.getByRole("button", { name: /Làm mới/i });
    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("disables batch selection checkbox for self-created questions (Maker-Checker) and submits batchApprove with version", async () => {
    mockBatchApprove.mockResolvedValueOnce({
      approvedCount: 1,
      skipped: [],
    });

    render(
      <ReviewQueueTable
        questions={sampleQueueQuestions}
        total={2}
        page={1}
        limit={20}
        currentUserId="current-reviewer-id"
        currentUserRole="teacher"
        onSelectQuestion={vi.fn()}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
        onResetFilters={vi.fn()}
      />
    );

    const otherCheckbox = screen.getByTestId("select-review-q-other-1");
    const selfCheckbox = screen.getByTestId("select-review-q-self-2");

    expect(otherCheckbox).not.toBeDisabled();
    expect(selfCheckbox).toBeDisabled();
    expect(screen.getByText(/Bài của bạn/i)).toBeInTheDocument();

    fireEvent.click(otherCheckbox);

    const batchBtn = screen.getByRole("button", {
      name: /Phê duyệt hàng loạt \(1\)/i,
    });
    fireEvent.click(batchBtn);

    await waitFor(() => {
      expect(mockBatchApprove).toHaveBeenCalledWith({
        items: [{ questionId: "q-other-1", version: 2 }],
      });
    });
  });

  it("provides 10 dòng and 20 dòng pagination options (#1006) and computes totalPages safely", () => {
    const onLimitChange = vi.fn();
    render(
      <ReviewQueueTable
        questions={sampleQueueQuestions}
        total={25}
        page={1}
        limit={20}
        currentUserId="current-reviewer-id"
        onSelectQuestion={vi.fn()}
        onPageChange={vi.fn()}
        onLimitChange={onLimitChange}
        onResetFilters={vi.fn()}
      />
    );

    const btn10 = screen.getByRole("button", { name: "10 dòng" });
    const btn20 = screen.getByRole("button", { name: "20 dòng" });
    expect(btn10).toBeInTheDocument();
    expect(btn20).toBeInTheDocument();
    expect(screen.getByText(/Trang 1 \/ 2/i)).toBeInTheDocument();

    fireEvent.click(btn10);
    expect(onLimitChange).toHaveBeenCalledWith(10);
  });
});
