import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExamBuilderPage from "@/app/(teacher)/exams/[id]/builder/page";
import PublicExamsPage from "@/app/(student)/exams/page";
import { examsService } from "@/services/exams.service";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "ex-1" }),
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => "/exams",
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/services/exams.service", () => ({
  examsService: {
    getExamStructure: vi.fn(),
    configureSections: vi.fn(),
    addQuestions: vi.fn(),
    reorderQuestions: vi.fn(),
    removeQuestion: vi.fn(),
    autoGenerate: vi.fn(),
    publishExam: vi.fn(),
    unpublishExam: vi.fn(),
    closeExam: vi.fn(),
    archiveExam: vi.fn(),
    getPublicExams: vi.fn(),
    getExamOverview: vi.fn(),
  },
}));

vi.mock("@/hooks/use-questions", () => ({
  useQuestions: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock("@/services/question-groups.service", () => ({
  questionGroupsService: {
    getQuestionGroups: vi.fn().mockResolvedValue([]),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("Sprint 5 Frontend End-to-End Integration Flow (Tasks 1-5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("Flow 1: Teacher opens Exam Builder (/exams/[id]/builder), triggers Auto-Generate, and publishes exam", async () => {
    vi.mocked(examsService.getExamStructure).mockResolvedValue({
      id: "ex-1",
      title: "ETS TOEIC 2026 Full Mock 01",
      type: "full_test",
      status: "draft",
      version: 1,
      totalQuestions: 200,
      sections: [
        {
          id: "sec-5",
          examId: "ex-1",
          partId: "p-5",
          partNumber: 5,
          partName: "Incomplete Sentences",
          targetQuestionsCount: 30,
          targetDurationMinutes: 12,
          actualQuestionsCount: 30,
        },
      ],
      questions: [
        {
          id: "eq-1",
          examId: "ex-1",
          examSectionId: "sec-5",
          questionId: "q-1",
          orderIndex: 1,
          questionGroupId: null,
          groupOrder: null,
          partNumber: 5,
          difficulty: "medium",
          content: "The board of directors _____ the merger proposal.",
        },
      ],
    });

    vi.mocked(examsService.autoGenerate).mockResolvedValueOnce({
      id: "ex-1",
      title: "ETS TOEIC 2026 Full Mock 01",
      type: "full_test",
      status: "draft",
      version: 2,
      totalQuestions: 200,
      sections: [],
      questions: [],
    });

    vi.mocked(examsService.publishExam).mockResolvedValueOnce({
      id: "ex-1",
      title: "ETS TOEIC 2026 Full Mock 01",
      status: "published",
      version: 3,
      isScheduled: false,
      openAt: null,
      closeAt: null,
      publishedAt: "2026-11-24T10:00:00.000Z",
      updatedAt: "2026-11-24T10:00:00.000Z",
    });

    renderWithQuery(<ExamBuilderPage />);

    expect(
      await screen.findByText("ETS TOEIC 2026 Full Mock 01")
    ).toBeInTheDocument();

    // Open Auto-Generate Modal & trigger generation
    fireEvent.click(
      screen.getByRole("button", { name: /Sinh đề tự động \(Auto-Generate\)/i })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Xác nhận Sinh đề tự động/i })
    );

    await waitFor(() => {
      expect(examsService.autoGenerate).toHaveBeenCalledWith(
        "ex-1",
        expect.objectContaining({ version: 1 })
      );
    });

    // Publish Exam
    fireEvent.click(
      screen.getByRole("button", { name: /Xuất bản đề thi/i })
    );

    await waitFor(() => {
      expect(examsService.publishExam).toHaveBeenCalledWith("ex-1", {
        version: 1,
      });
    });
  });

  it("Flow 2: Student browses Public Exam Catalog (/exams) and opens Zero-Answer-Leakage Overview Modal", async () => {
    vi.mocked(examsService.getPublicExams).mockResolvedValue({
      items: [
        {
          id: "ex-pub-1",
          title: "ETS TOEIC 2026 Public Test 01",
          description: "Standard 200-question full mock test",
          type: "full_test",
          durationMinutes: 120,
          totalQuestions: 200,
          allowPartPractice: true,
          totalAttempts: 42,
          openAt: null,
          closeAt: null,
          isScheduled: false,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    vi.mocked(examsService.getExamOverview).mockResolvedValue({
      id: "ex-pub-1",
      title: "ETS TOEIC 2026 Public Test 01",
      description: "Standard 200-question full mock test",
      type: "full_test",
      durationMinutes: 120,
      totalQuestions: 200,
      allowPartPractice: true,
      openAt: null,
      closeAt: null,
      isScheduled: false,
      remainingAttempts: null,
      parts: [
        {
          partNumber: 5,
          partName: "Incomplete Sentences",
          questionCount: 30,
          suggestedDuration: 12,
        },
      ],
    });

    renderWithQuery(<PublicExamsPage />);

    expect(
      await screen.findByText("ETS TOEIC 2026 Public Test 01")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Xem cấu trúc đề/i }));

    await waitFor(() => {
      expect(examsService.getExamOverview).toHaveBeenCalledWith("ex-pub-1");
      expect(
        screen.getByText(/Part 5: Incomplete Sentences/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Không giới hạn/i)).toBeInTheDocument();
    });
  });
});
