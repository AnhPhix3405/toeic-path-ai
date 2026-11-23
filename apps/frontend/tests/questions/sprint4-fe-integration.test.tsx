import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ContentReviewsPage from "@/app/(teacher)/content-reviews/page";
import QuestionDetailPage from "@/app/(teacher)/questions/[id]/page";
import { useAuthStore } from "@/stores/auth.store";

const mockReplace = vi.fn();
const mockRefetchQueue = vi.fn();
const mockQuickFix = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => "/content-reviews",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: "q-rev-100" }),
}));

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
  useTopics: () => ({ data: [] }),
}));

vi.mock("@/hooks/use-media", () => ({
  useQuestionMedia: () => ({ data: [], isLoading: false }),
  useQuestionGroupMedia: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/use-questions", () => ({
  useQuestion: () => ({
    data: {
      id: "q-rev-100",
      content:
        "The new software _____ productivity across all departments.",
      questionType: "single_choice",
      status: "revision_requested",
      version: 2,
      createdBy: "teacher-1",
      groupOrder: null,
      explanation: "Needs present tense.",
      options: [
        {
          id: "o1",
          label: "A",
          content: "enhances",
          isCorrect: true,
          position: 1,
        },
        {
          id: "o2",
          label: "B",
          content: "enhancing",
          isCorrect: false,
          position: 2,
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
      updatedAt: "2026-11-23T09:00:00.000Z",
    },
    isLoading: false,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-question-reviews", () => ({
  useReviewQueue: () => ({
    data: {
      items: [
        {
          id: "q-rev-100",
          content:
            "The new software _____ productivity across all departments.",
          questionType: "single_choice",
          status: "pending_review",
          version: 1,
          createdBy: "teacher-creator",
          creator: {
            id: "teacher-creator",
            fullName: "Cô Giáo Lan",
            email: "lan@toeic.ai",
          },
          groupOrder: null,
          explanation: "Needs present tense.",
          options: [
            {
              id: "o1",
              label: "A",
              content: "enhanses",
              isCorrect: true,
              position: 1,
            },
            {
              id: "o2",
              label: "B",
              content: "enhancing",
              isCorrect: false,
              position: 2,
            },
            {
              id: "o3",
              label: "C",
              content: "enhanced",
              isCorrect: false,
              position: 3,
            },
            {
              id: "o4",
              label: "D",
              content: "enhancement",
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
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    },
    isLoading: false,
    isFetching: false,
    refetch: mockRefetchQueue,
  }),
  useBatchApproveQuestions: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useApproveQuestion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useQuickFixApprove: () => ({ mutateAsync: mockQuickFix, isPending: false }),
  useRequestRevision: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRejectQuestion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useQuestionHistories: () => ({
    data: [
      {
        id: "hist-1",
        questionId: "q-rev-100",
        changedBy: "reviewer-2",
        author: { id: "reviewer-2", fullName: "Reviewer Minh" },
        changeType: "quick_fixed",
        comment: "Fixed typo in option A",
        createdAt: "2026-11-23T09:10:00.000Z",
        snapshotBefore: {
          content:
            "The new software _____ productivity across all departments.",
          options: [
            { id: "o1", label: "A", content: "enhanses", isCorrect: true },
          ],
        },
        snapshotAfter: {
          content:
            "The new software _____ productivity across all departments.",
          options: [
            { id: "o1", label: "A", content: "enhances", isCorrect: true },
          ],
        },
      },
    ],
    isLoading: false,
  }),
  useQuestionReviewLogs: () => ({
    data: [
      {
        id: "log-100",
        questionId: "q-rev-100",
        reviewerId: "reviewer-2",
        reviewer: { id: "reviewer-2", fullName: "Reviewer Minh" },
        action: "revision_requested",
        feedback: "Vui lòng bổ sung đủ 4 lựa chọn A, B, C, D cho Part 5.",
        version: 2,
        createdAt: "2026-11-23T09:00:00.000Z",
      },
    ],
    isLoading: false,
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Sprint 4 Frontend End-to-End Integration Flow (Tasks 3, 4, 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: "reviewer-2",
        email: "reviewer2@toeic.ai",
        fullName: "Reviewer Minh",
        role: "teacher",
      } as never,
      isAuthenticated: true,
    });
  });

  it("Flow 1: Reviewer opens /content-reviews queue, selects a question into Split-Screen, edits via Quick-Fix and approves", async () => {
    mockQuickFix.mockResolvedValueOnce({
      id: "q-rev-100",
      status: "published",
      version: 2,
    });

    renderWithQuery(<ContentReviewsPage />);

    expect(
      screen.getByText(/Hàng đợi kiểm duyệt câu hỏi TOEIC/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The new software _____ productivity across all departments."
      )
    ).toBeInTheDocument();

    // Open Split-Screen workspace
    fireEvent.click(screen.getByRole("button", { name: /Thẩm định/i }));

    // Enable Quick-Fix mode
    fireEvent.click(
      screen.getByRole("button", { name: /Sửa nhanh \(Quick-Fix\)/i })
    );

    const optionAInput = screen.getByDisplayValue("enhanses");
    fireEvent.change(optionAInput, { target: { value: "enhances" } });

    fireEvent.click(
      screen.getByRole("button", { name: /Lưu sửa nhanh & Phê duyệt/i })
    );

    await waitFor(() => {
      expect(mockQuickFix).toHaveBeenCalledWith({
        id: "q-rev-100",
        dto: expect.objectContaining({
          version: 1,
          options: expect.arrayContaining([
            expect.objectContaining({
              id: "o1",
              content: "enhances",
              isCorrect: true,
            }),
          ]),
        }),
      });
    });
  });

  it("Flow 2: Teacher views question detail (/questions/[id]) and sees Reviewer feedback banner, timeline & Version diff viewer", () => {
    renderWithQuery(<QuestionDetailPage />);

    expect(
      screen.getAllByText(
        /Vui lòng bổ sung đủ 4 lựa chọn A, B, C, D cho Part 5/i
      ).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Reviewer Minh/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("enhanses")).toBeInTheDocument();
  });
});
