import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuestionTable } from "@/features/questions/components/question-table";
import { QuestionFilters } from "@/features/questions/components/question-filters";
import { useQuestionFilterStore } from "@/stores/question-filter.store";

const mockRefetchQuestions = vi.fn();
const mockSubmitForReview = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock("@/hooks/use-questions", () => ({
  useQuestions: () => ({
    data: {
      data: [
        {
          id: "q-draft-1",
          content: "Draft question ready for review",
          questionType: "single_choice",
          status: "draft",
          difficulty: "easy",
          groupOrder: null,
          explanation: "Exp",
          options: [],
          part: {
            id: "p5",
            partNumber: 5,
            name: "Incomplete Sentences",
            description: null,
          },
          topics: [],
          skills: [],
          createdAt: "2026-11-23T08:00:00.000Z",
          updatedAt: "2026-11-23T08:00:00.000Z",
        },
        {
          id: "q-pub-2",
          content: "Published question locked from selection",
          questionType: "single_choice",
          status: "published",
          difficulty: "hard",
          groupOrder: null,
          explanation: null,
          options: [],
          part: {
            id: "p5",
            partNumber: 5,
            name: "Incomplete Sentences",
            description: null,
          },
          topics: [],
          skills: [],
          createdAt: "2026-11-23T08:00:00.000Z",
          updatedAt: "2026-11-23T08:00:00.000Z",
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
    isLoading: false,
    isFetching: false,
    refetch: mockRefetchQuestions,
  }),
  useDeleteQuestion: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-classification", () => ({
  useToeicParts: () => ({ data: [] }),
}));

vi.mock("@/hooks/use-questions-import", () => ({
  useSubmitQuestionsForReview: () => ({
    mutateAsync: mockSubmitForReview,
    isPending: false,
  }),
}));

describe("QuestionBank Bulk Submit for Review (UC14-A5, PMR 004 #5) & List Rules (#1006, #1007)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQuestionFilterStore.getState().resetFilters();
  });

  it("renders Import Excel/ZIP link and Refresh button (#1007) in QuestionFilters", () => {
    render(<QuestionFilters />);

    const importLink = screen.getByRole("link", {
      name: /Import Excel \/ ZIP/i,
    });
    expect(importLink).toHaveAttribute("href", "/questions/import");

    const refreshBtn = screen.getByRole("button", { name: /Làm mới/i });
    expect(refreshBtn).toBeInTheDocument();

    fireEvent.click(refreshBtn);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["questions"],
    });
  });

  it("only enables selection for draft/revision_requested questions, calls submitForReview, and displays skipped details if any (UC14-A5, PMR 004 #5)", async () => {
    mockSubmitForReview.mockResolvedValueOnce({
      submittedCount: 0,
      submittedIds: [],
      skipped: [
        {
          id: "q-draft-1",
          reason: "Nhóm câu hỏi có câu con chưa hoàn thiện hoặc thiếu đáp án.",
        },
      ],
    });

    render(<QuestionTable />);

    const draftCheckbox = screen.getByTestId("select-question-q-draft-1");
    const publishedCheckbox = screen.getByTestId("select-question-q-pub-2");

    expect(draftCheckbox).not.toBeDisabled();
    expect(publishedCheckbox).toBeDisabled();

    fireEvent.click(draftCheckbox);

    const submitReviewBtn = screen.getByRole("button", {
      name: /Gửi duyệt \(1\)/i,
    });
    fireEvent.click(submitReviewBtn);

    await waitFor(() => {
      expect(mockSubmitForReview).toHaveBeenCalledWith({
        questionIds: ["q-draft-1"],
      });
      expect(
        screen.getByText(/Nhóm câu hỏi có câu con chưa hoàn thiện hoặc thiếu đáp án/i)
      ).toBeInTheDocument();
    });
  });

  it("provides 10 and 20 page size options in QuestionTable pagination footer (#1006)", () => {
    render(<QuestionTable />);

    const limit10Btn = screen.getByRole("button", { name: "10 dòng" });
    const limit20Btn = screen.getByRole("button", { name: "20 dòng" });
    expect(limit10Btn).toBeInTheDocument();
    expect(limit20Btn).toBeInTheDocument();

    fireEvent.click(limit10Btn);
    expect(useQuestionFilterStore.getState().limit).toBe(10);

    const pageInput = screen.getByRole("spinbutton", {
      name: /Nhập số trang cần xem/i,
    }) as HTMLInputElement;
    expect(pageInput).toBeInTheDocument();
    expect(pageInput.value).toBe("1");

    // Out-of-bounds input (999 when totalPages = 1) resets to "1" on blur (BUG-S4-UI-001)
    fireEvent.change(pageInput, { target: { value: "999" } });
    fireEvent.blur(pageInput);
    expect(useQuestionFilterStore.getState().page).toBe(1);
    expect(pageInput.value).toBe("1");
  });
});
