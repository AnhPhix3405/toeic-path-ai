import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChildQuestionsManager } from "@/features/question-groups/components/child-questions-manager";
import * as questionHooks from "@/hooks/use-questions";
import { Question } from "@/types/question";

vi.mock("@/hooks/use-questions");

const mockChildQuestions: Question[] = [
  {
    id: "child-1",
    content: "What is the purpose of the email?",
    questionType: "single_choice",
    status: "published",
    groupOrder: 1,
    explanation: null,
    options: [
      { id: "o-1", label: "A", content: "To schedule a meeting", isCorrect: true, position: 1 },
      { id: "o-2", label: "B", content: "To request a refund", isCorrect: false, position: 2 },
    ],
    part: { id: "p-7", partNumber: 7, name: "Reading Comprehension", description: null },
    difficulty: "medium",
    topics: [],
    skills: [],
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
  },
];

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ChildQuestionsManager Component", () => {
  const mockAssignMutate = vi.fn();
  const mockDetachMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(questionHooks.useAssignQuestionGroup).mockReturnValue({
      mutateAsync: mockAssignMutate,
      isPending: false,
    } as unknown as ReturnType<typeof questionHooks.useAssignQuestionGroup>);

    vi.mocked(questionHooks.useDetachQuestionGroup).mockReturnValue({
      mutateAsync: mockDetachMutate,
      isPending: false,
    } as unknown as ReturnType<typeof questionHooks.useDetachQuestionGroup>);

    vi.mocked(questionHooks.useQuestions).mockReturnValue({
      data: {
        data: [
          {
            id: "cand-1",
            content: "Who will present next week?",
            questionType: "single_choice",
            status: "draft",
            groupOrder: null,
            explanation: null,
            options: [],
            part: null,
            difficulty: "easy",
            topics: [],
            skills: [],
            createdAt: "2026-03-01T00:00:00Z",
            updatedAt: "2026-03-01T00:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof questionHooks.useQuestions>);
  });

  it("renders list of child questions with orders and correct answer display", () => {
    renderWithQuery(
      <ChildQuestionsManager groupId="g-100" questions={mockChildQuestions} />
    );

    expect(screen.getByText("Các câu hỏi con trong nhóm (1)")).toBeDefined();
    expect(screen.getByText("#1")).toBeDefined();
    expect(screen.getByText("What is the purpose of the email?")).toBeDefined();
    expect(screen.getByText(/Đáp án đúng: To schedule a meeting/i)).toBeDefined();
  });

  it("opens assign modal and lists available candidates", async () => {
    renderWithQuery(
      <ChildQuestionsManager groupId="g-100" questions={mockChildQuestions} />
    );

    const assignBtn = screen.getByText("Gán câu hỏi vào nhóm");
    fireEvent.click(assignBtn);

    expect(screen.getByText("Gán câu hỏi vào nhóm bài đọc")).toBeDefined();
    expect(screen.getByText("Who will present next week?")).toBeDefined();
  });
});
