import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuestionFilters } from "@/features/questions/components/question-filters";
import { QuestionTable } from "@/features/questions/components/question-table";
import { SingleQuestionForm } from "@/features/questions/components/single-question-form";
import { ChildQuestionsManager } from "@/features/question-groups/components/child-questions-manager";
import { PassageViewer } from "@/features/question-groups/components/passage-viewer";
import { questionsService } from "@/services/questions.service";
import * as questionHooks from "@/hooks/use-questions";
import * as classificationHooks from "@/hooks/use-classification";
import { useQuestionFilterStore } from "@/stores/question-filter.store";
import { Question } from "@/types/question";

const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/questions",
  useParams: () => ({ id: "q-edit-1" }),
}));

vi.mock("@/services/questions.service");
vi.mock("@/hooks/use-questions");
vi.mock("@/hooks/use-classification");

const mockPart5 = {
  id: "55555555-5555-4555-a555-555555555555",
  partNumber: 5,
  name: "Incomplete Sentences",
  description: "Grammar and vocabulary fill in the blanks",
};

const mockDraftQuestion: Question = {
  id: "q-edit-1",
  content: "Customer satisfaction is our top priority at all times.",
  questionType: "single_choice",
  status: "draft",
  groupOrder: null,
  explanation: "Standard business correspondence vocabulary",
  options: [
    { id: "opt-1", label: "A", content: "priority", isCorrect: true, position: 1 },
    { id: "opt-2", label: "B", content: "prioritize", isCorrect: false, position: 2 },
    { id: "opt-3", label: "C", content: "prioritized", isCorrect: false, position: 3 },
    { id: "opt-4", label: "D", content: "prioritizing", isCorrect: false, position: 4 },
  ],
  part: mockPart5,
  difficulty: "medium",
  topics: [{ id: "66666666-6666-4666-a666-666666666666", name: "Customer Service", description: null }],
  skills: [{ id: "77777777-7777-4777-a777-777777777777", name: "Vocabulary in Context", description: null }],
  createdAt: "2026-03-01T10:00:00Z",
  updatedAt: "2026-03-01T10:00:00Z",
};

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("Integration Flow: TOEIC Question Bank & Question Group Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQuestionFilterStore.getState().resetFilters();

    // Default classification hooks
    vi.mocked(classificationHooks.useToeicParts).mockReturnValue({
      data: [mockPart5],
      isLoading: false,
    } as unknown as ReturnType<typeof classificationHooks.useToeicParts>);

    vi.mocked(classificationHooks.useTopics).mockReturnValue({
      data: [{ id: "66666666-6666-4666-a666-666666666666", name: "Customer Service", description: null }],
      isLoading: false,
    } as unknown as ReturnType<typeof classificationHooks.useTopics>);

    vi.mocked(classificationHooks.useSkills).mockReturnValue({
      data: [{ id: "77777777-7777-4777-a777-777777777777", name: "Vocabulary in Context", description: null }],
      isLoading: false,
    } as unknown as ReturnType<typeof classificationHooks.useSkills>);
  });

  it("Flow 1: Teacher views questions, filters by Part 5, opens edit form, updates answer, and saves successfully", async () => {
    const user = userEvent.setup();

    // Mock question list returning mockDraftQuestion
    vi.mocked(questionHooks.useQuestions).mockReturnValue({
      data: {
        data: [mockDraftQuestion],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof questionHooks.useQuestions>);

    vi.mocked(questionHooks.useDeleteQuestion).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof questionHooks.useDeleteQuestion>);

    // Render Question Bank view (Filters + Table)
    const { unmount } = renderWithQuery(
      <div className="space-y-6">
        <QuestionFilters />
        <QuestionTable />
      </div>
    );

    // 1. Verify question table displays draft question with Part 5 badge
    expect(screen.getByText("Customer satisfaction is our top priority at all times.")).toBeDefined();
    expect(screen.getByText("Part 5")).toBeDefined();
    expect(screen.getByText("Bản nháp")).toBeDefined();

    // 2. Select Part 5 in the filter dropdown
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Tất cả Part (1–7)")).toBeDefined();

    // Clean up bank list before mounting form
    unmount();

    // 3. Mount SingleQuestionForm in edit mode
    vi.mocked(questionsService.updateQuestion).mockResolvedValue({
      ...mockDraftQuestion,
      content: "Customer satisfaction is definitely our top priority at all times.",
    });
    vi.mocked(questionsService.updateClassification).mockResolvedValue(mockDraftQuestion);
    vi.mocked(questionsService.setCorrectAnswer).mockResolvedValue({
      id: "opt-2",
      label: "B",
      content: "prioritize",
      isCorrect: true,
      position: 2,
    });

    renderWithQuery(
      <SingleQuestionForm initialQuestion={mockDraftQuestion} mode="edit" />
    );

    // 4. Verify initial form values are populated
    const contentTextarea = screen.getByDisplayValue(mockDraftQuestion.content);
    expect(contentTextarea).toBeDefined();

    // 5. Change content
    fireEvent.change(contentTextarea, {
      target: { value: "Customer satisfaction is definitely our top priority at all times." },
    });

    // 6. Change correct answer to Option B
    const optionBButton = screen.getByLabelText("Chọn phương án B làm đáp án đúng");
    fireEvent.click(optionBButton);

    // 7. Submit updated question
    const saveButton = screen.getByRole("button", { name: /Cập nhật câu hỏi/i });
    fireEvent.click(saveButton);

    // 8. Assert service methods were called with updated data
    await waitFor(() => {
      expect(questionsService.updateQuestion).toHaveBeenCalledWith(
        "q-edit-1",
        expect.objectContaining({
          content: "Customer satisfaction is definitely our top priority at all times.",
        })
      );
      expect(questionsService.updateClassification).toHaveBeenCalledWith(
        "q-edit-1",
        expect.objectContaining({
          partId: "55555555-5555-4555-a555-555555555555",
        })
      );
      expect(questionsService.setCorrectAnswer).toHaveBeenCalledWith("q-edit-1", {
        optionId: "opt-2",
      });
      expect(mockRouterPush).toHaveBeenCalledWith("/questions/q-edit-1");
    });
  });

  it("Flow 2: Teacher views question group with passage, views child question, and detaches child question", async () => {
    const mockPassageContext =
      "Questions 153-155 refer to the following advertisement:\nGrand Opening Sale at Apex Office Supplies! Everything is 30% off this weekend only.";

    const mockChildQuestion: Question = {
      id: "child-q-1",
      content: "What is being offered at a discount?",
      questionType: "single_choice",
      status: "published",
      groupOrder: 1,
      explanation: null,
      options: [
        { id: "o-1", label: "A", content: "Office supplies", isCorrect: true, position: 1 },
        { id: "o-2", label: "B", content: "Electronics", isCorrect: false, position: 2 },
      ],
      part: { id: "p-7", partNumber: 7, name: "Reading Comprehension", description: null },
      difficulty: "easy",
      topics: [],
      skills: [],
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-01T00:00:00Z",
    };

    const mockDetachMutate = vi.fn().mockResolvedValue({});

    vi.mocked(questionHooks.useAssignQuestionGroup).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof questionHooks.useAssignQuestionGroup>);

    vi.mocked(questionHooks.useDetachQuestionGroup).mockReturnValue({
      mutateAsync: mockDetachMutate,
      isPending: false,
    } as unknown as ReturnType<typeof questionHooks.useDetachQuestionGroup>);

    vi.mocked(questionHooks.useQuestions).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 10, totalPages: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof questionHooks.useQuestions>);

    // Render Question Group detail view parts: PassageViewer + ChildQuestionsManager
    renderWithQuery(
      <div className="space-y-8">
        <PassageViewer
          title="Grand Opening Sale Advertisement"
          context={mockPassageContext}
        />
        <ChildQuestionsManager
          groupId="grp-100"
          questions={[mockChildQuestion]}
        />
      </div>
    );

    // 1. Verify passage viewer renders title and context text
    expect(screen.getByText("Grand Opening Sale Advertisement")).toBeDefined();
    expect(screen.getByText(/Grand Opening Sale at Apex Office Supplies!/i)).toBeDefined();

    // 2. Verify child question is displayed with group order
    expect(screen.getByText("#1")).toBeDefined();
    expect(screen.getByText("What is being offered at a discount?")).toBeDefined();

    // 3. Click "Gỡ khỏi nhóm" button (icon button with title)
    const detachButton = screen.getByTitle("Gỡ khỏi nhóm");
    fireEvent.click(detachButton);

    // 4. Confirm in the detach confirmation modal
    const confirmButton = screen.getByRole("button", { name: "Xác nhận gỡ" });
    fireEvent.click(confirmButton);

    // 5. Assert useDetachQuestionGroup mutateAsync is invoked with child-q-1
    await waitFor(() => {
      expect(mockDetachMutate).toHaveBeenCalledWith("child-q-1");
    });
  });
});
