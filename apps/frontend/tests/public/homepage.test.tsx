import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { toast } from "sonner";
import HomePage from "@/app/page";
import { useLandingSummary } from "@/features/home/hooks/use-landing-summary";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/features/home/hooks/use-landing-summary", () => ({
  useLandingSummary: vi.fn(),
}));

describe("Homepage Showcase (Learner-Centric Live Features & Upcoming Roadmap)", () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders inclusive Hero headline, Featured Exams, Live Features, Upcoming Roadmap, zero dev jargon, and no redundant 7-Parts overview", () => {
    vi.mocked(useLandingSummary).mockReturnValue({
      data: {
        stats: {
          publishedExamsCount: 8,
          publishedQuestionsCount: 600,
          completedAttemptsCount: 42,
          supportedToeicPartsCount: 7,
        },
        featuredExams: [
          {
            id: "ex-1",
            title: "ETS TOEIC 2026 Full Test 01",
            slug: "ets-toeic-2026-full-test-01",
            description: "Đề thi chuẩn ETS 200 câu",
            type: "full_test",
            durationMinutes: 120,
            totalQuestions: 200,
            allowPartPractice: true,
            totalAttempts: 12,
            openAt: null,
            closeAt: null,
            isScheduled: false,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: mockRefetch,
    } as never);

    const { container } = render(<HomePage />);

    // 1. Inclusive Hero headline & live stats
    expect(
      screen.getByText(/điểm số TOEIC mục tiêu/i)
    ).toBeInTheDocument();
    expect(screen.getByText("8+")).toBeInTheDocument();
    expect(screen.getByText("600+")).toBeInTheDocument();
    expect(screen.getByText("42+")).toBeInTheDocument();

    // 2. Zero internal system/dev jargon on public landing page
    const pageText = container.textContent || "";
    expect(pageText).not.toMatch(
      /BullMQ|RS256|Zero Answer Leakage|JSONB|Presigned URL|Maker-Checker|Sprint \d|UC\d\d|AutoSubmitCron/i
    );

    // 3. Featured Exam links to Public Overview (/exams/:slug)
    expect(
      screen.getByText("ETS TOEIC 2026 Full Test 01")
    ).toBeInTheDocument();
    const examLink = screen.getByRole("link", {
      name: /Xem cấu trúc & Làm bài/i,
    });
    expect(examLink).toHaveAttribute(
      "href",
      "/exams/ets-toeic-2026-full-test-01"
    );

    // 4. Refresh button (#1007)
    const refreshBtn = screen.getByRole("button", {
      name: /Làm mới danh sách đề thi nổi bật/i,
    });
    fireEvent.click(refreshBtn);
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    // 5. Filter tab empty state when switching to Mini Test
    const miniTestTab = screen.getByRole("tab", { name: /Mini Test/i });
    fireEvent.click(miniTestTab);
    expect(
      screen.getByText(/Chưa có đề thi thuộc nhóm này trong danh sách nổi bật/i)
    ).toBeInTheDocument();

    // 6. Redundant 7-Parts explainer section is removed
    expect(pageText).not.toMatch(/7 Parts|7 Phần Thi/i);

    // 7. Live Features & Upcoming Roadmap badges + toast preview
    expect(
      screen.getByText("Phòng Thi Thử Thực Chiến & Luyện Tập Linh Hoạt")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Lộ Trình Học Tập Thích Ứng Theo Mục Tiêu")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Upcoming").length).toBeGreaterThanOrEqual(5);

    const upcomingBtns = screen.getAllByRole("button", {
      name: /Tìm hiểu tính năng \(Upcoming\)/i,
    });
    fireEvent.click(upcomingBtns[0]);
    expect(toast.info).toHaveBeenCalled();
  });

  it("falls back to 'ETS 10–990' when completedAttemptsCount is 0 and handles error state gracefully", () => {
    vi.mocked(useLandingSummary).mockReturnValue({
      data: {
        stats: {
          publishedExamsCount: 0,
          publishedQuestionsCount: 0,
          completedAttemptsCount: 0,
          supportedToeicPartsCount: 7,
        },
        featuredExams: [],
      },
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: mockRefetch,
    } as never);

    render(<HomePage />);

    expect(screen.getByText("ETS 10–990")).toBeInTheDocument();
    expect(
      screen.getByText(/Không thể tải danh sách đề thi nổi bật lúc này/i)
    ).toBeInTheDocument();
  });
});
