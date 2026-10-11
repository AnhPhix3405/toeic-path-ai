import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuestionTable } from "@/features/questions/components/question-table";
import * as questionHooks from "@/hooks/use-questions";
import { useQuestionFilterStore } from "@/stores/question-filter.store";
import { Question } from "@/types/question";

vi.mock("@/hooks/use-questions");

const mockQuestions: Question[] = [
  {
    id: "q-1",
    content: "Where is the conference being held?",
    questionType: "single_choice",
    status: "draft",
    groupOrder: null,
    explanation: "Conference room A",
    options: [
      { id: "opt-1", label: "A", content: "Room A", isCorrect: true, position: 1 },
      { id: "opt-2", label: "B", content: "Room B", isCorrect: false, position: 2 },
    ],
    part: { id: "p-5", partNumber: 5, name: "Incomplete Sentences", description: null },
    difficulty: "medium",
    topics: [],
    skills: [],
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "q-2",
    content: "The report will be finished tomorrow.",
    questionType: "single_choice",
    status: "published",
    groupOrder: null,
    explanation: null,
    options: [],
    part: { id: "p-6", partNumber: 6, name: "Text Completion", description: null },
    difficulty: "easy",
    topics: [],
    skills: [],
    createdAt: "2026-03-02T00:00:00Z",
    updatedAt: "2026-03-02T00:00:00Z",
  },
];

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("QuestionTable Component", () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useQuestionFilterStore.getState().resetFilters();

    vi.mocked(questionHooks.useDeleteQuestion).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof questionHooks.useDeleteQuestion>);
  });

  it("renders questions table with rows, parts, badges and options count", () => {
    vi.mocked(questionHooks.useQuestions).mockReturnValue({
      data: {
        data: mockQuestions,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof questionHooks.useQuestions>);

    renderWithQuery(<QuestionTable />);

    expect(screen.getByText("Where is the conference being held?")).toBeDefined();
    expect(screen.getByText("The report will be finished tomorrow.")).toBeDefined();
    expect(screen.getByText("Part 5")).toBeDefined();
    expect(screen.getByText("Part 6")).toBeDefined();
    expect(screen.getByText("Bản nháp")).toBeDefined();
    expect(screen.getByText("Đã xuất bản")).toBeDefined();
    expect(screen.getByText("2 lựa chọn")).toBeDefined();
  });

  it("renders empty state when no questions found", () => {
    vi.mocked(questionHooks.useQuestions).mockReturnValue({
      data: {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof questionHooks.useQuestions>);

    renderWithQuery(<QuestionTable />);

    expect(screen.getByText("Ngân hàng câu hỏi hiện đang trống")).toBeDefined();
  });

  it("disables delete action for published questions (PM Point 2 Status Guard)", async () => {
    vi.mocked(questionHooks.useQuestions).mockReturnValue({
      data: {
        data: mockQuestions,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof questionHooks.useQuestions>);

    const user = userEvent.setup();
    renderWithQuery(<QuestionTable />);

    const actionButtons = screen.getAllByLabelText("Tùy chọn thao tác");
    // Click action button for second item (published)
    await user.click(actionButtons[1]);

    const deleteOption = await screen.findByText("Xóa câu hỏi");
    expect(deleteOption.closest('[role="menuitem"]')).toHaveAttribute("aria-disabled", "true");
  });
});
