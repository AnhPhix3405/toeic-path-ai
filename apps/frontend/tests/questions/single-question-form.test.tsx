import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SingleQuestionForm } from "@/features/questions/components/single-question-form";
import { questionsService } from "@/services/questions.service";
import * as classificationHooks from "@/hooks/use-classification";
import { Question } from "@/types/question";

vi.mock("@/services/questions.service");
vi.mock("@/hooks/use-classification");
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockParts = [
  { id: "11111111-1111-4111-a111-111111111111", partNumber: 5, name: "Incomplete Sentences", description: null },
];

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("SingleQuestionForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(classificationHooks.useToeicParts).mockReturnValue({
      data: mockParts,
      isLoading: false,
    } as unknown as ReturnType<typeof classificationHooks.useToeicParts>);

    vi.mocked(classificationHooks.useTopics).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof classificationHooks.useTopics>);

    vi.mocked(classificationHooks.useSkills).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof classificationHooks.useSkills>);
  });

  it("renders form controls, textareas, and live preview card", () => {
    renderWithQuery(<SingleQuestionForm mode="create" />);

    expect(screen.getByPlaceholderText(/Nhập nội dung câu hỏi TOEIC/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Nội dung phương án A/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Nội dung phương án B/i)).toBeDefined();
    expect(screen.getByText("Mô phỏng đề thi TOEIC")).toBeDefined();
    expect(screen.getByText("Lưu câu hỏi mới")).toBeDefined();
  });

  it("shows read-only guard and hides submit button when editing published question (PM Point 2)", () => {
    const publishedQuestion: Question = {
      id: "q-pub",
      content: "Published content",
      questionType: "single_choice",
      status: "published",
      groupOrder: null,
      explanation: null,
      options: [
        { id: "o-1", label: "A", content: "A opt", isCorrect: true, position: 1 },
        { id: "o-2", label: "B", content: "B opt", isCorrect: false, position: 2 },
      ],
      part: mockParts[0],
      difficulty: "easy",
      topics: [],
      skills: [],
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-01T00:00:00Z",
    };

    renderWithQuery(<SingleQuestionForm mode="edit" initialQuestion={publishedQuestion} />);

    expect(
      screen.getByText(/Câu hỏi đã xuất bản hoặc đang chờ duyệt không thể chỉnh sửa trực tiếp/i)
    ).toBeDefined();
    expect(screen.queryByText("Cập nhật câu hỏi")).toBeNull();
  });

  it("validates and prevents submission when content is empty", async () => {
    renderWithQuery(<SingleQuestionForm mode="create" />);

    const submitBtn = screen.getByText("Lưu câu hỏi mới");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Nội dung câu hỏi phải có ít nhất 3 ký tự")).toBeDefined();
    });
  });
});
