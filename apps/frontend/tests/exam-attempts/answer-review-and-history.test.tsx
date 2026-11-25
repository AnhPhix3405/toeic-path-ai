import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnswerReviewWorkspace } from "@/features/exam-attempts/components/review/answer-review-workspace";
import { AttemptHistoryTable } from "@/features/exam-attempts/components/history/attempt-history-table";
import { ScoreTrendChart } from "@/features/exam-attempts/components/history/score-trend-chart";
import {
  ExamAttemptHistoryItem,
  ExamAttemptReviewResponse,
} from "@/types/exam-attempt";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Sprint 7 Tasks 3 & 4 — AnswerReviewWorkspace, ScoreTrendChart & AttemptHistoryTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
  });

  it("AnswerReviewWorkspace renders dynamic Part pills (PMR 033 #2), handles nullable content (#1002), and toggles Transcript", () => {
    const review: ExamAttemptReviewResponse = {
      attemptId: "50000000-0000-4000-8000-000000000001",
      filterCounts: { all: 2, correct: 1, wrong: 1, skipped: 0, marked: 1 },
      questionGroups: [],
      questions: [
        {
          id: "20000000-0000-4000-8000-000000000001",
          partNumber: 1,
          orderIndex: 1,
          content: null,
          transcript: "(A) He is typing on a laptop.",
          options: [
            { id: "o1", label: "A", content: null, isCorrect: true },
            { id: "o2", label: "B", content: null, isCorrect: false },
          ],
          selectedOptionId: "o2",
          correctOptionId: "o1",
          isCorrect: false,
          isMarkedForReview: true,
          timeSpentSeconds: 14,
          explanation: "Đáp án đúng là A vì người đàn ông đang gõ máy tính.",
        },
      ],
    };

    const onFilterChange = vi.fn();
    const onPartChange = vi.fn();

    renderWithQuery(
      <AnswerReviewWorkspace
        review={review}
        attemptSlugOrId="att_9xK2mP7qR4"
        availableParts={[1, 5]}
        activeFilter="all"
        onFilterChange={onFilterChange}
        onPartChange={onPartChange}
      />
    );

    // Dynamic Part pills: Part 1 & Part 5 exist; Part 7 does NOT exist (prevents 400 ERR_PART_NOT_IN_ATTEMPT)
    expect(screen.getByRole("button", { name: "Part 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Part 5" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Part 7" })).toBeNull();

    // Nullable content fallback (#1002)
    expect(screen.getByText(/Nội dung câu hỏi nằm trong tệp Audio/i)).toBeTruthy();

    // Toggle transcript
    fireEvent.click(screen.getByText(/Lời thoại Audio \(Transcript\)/i));
    expect(screen.getByText("(A) He is typing on a laptop.")).toBeTruthy();

    // Explanation visible
    expect(screen.getByText(/người đàn ông đang gõ máy tính/i)).toBeTruthy();
  });

  it("AttemptHistoryTable renders CodeBadge, #1006 pagination, #1007 refresh, #1009 date validation, and pretty URLs", () => {
    const items: ExamAttemptHistoryItem[] = [
      {
        attemptId: "50000000-0000-4000-8000-000000000001",
        attemptCode: "att_9xK2mP7qR4",
        examId: "10000000-0000-4000-8000-000000000001",
        examTitle: "ETS TOEIC 2026 Test 01",
        mode: "full_exam",
        selectedParts: null,
        status: "submitted",
        totalScore: 810,
        listeningScore: 420,
        readingScore: 390,
        correctCount: 162,
        totalQuestions: 200,
        accuracyPercentage: 81,
        durationSpentSeconds: 6000,
        isPassed: true,
        startedAt: "2026-11-24T08:00:00.000Z",
        submittedAt: "2026-11-24T09:40:00.000Z",
      },
    ];

    const onRefresh = vi.fn();
    const onDateRangeChange = vi.fn();

    render(
      <AttemptHistoryTable
        items={items}
        total={1}
        page={1}
        limit={10}
        fromDate="2026-11-20"
        toDate="2026-11-25"
        onRefresh={onRefresh}
        onModeChange={vi.fn()}
        onStatusChange={vi.fn()}
        onDateRangeChange={onDateRangeChange}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
        onResetFilters={vi.fn()}
      />
    );

    expect(screen.getByText("att_9xK2mP7qR4")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Kết quả/i }).getAttribute("href")
    ).toBe("/exam-attempts/att_9xK2mP7qR4/result");
    expect(
      screen.getByRole("link", { name: /Lời giải/i }).getAttribute("href")
    ).toBe("/exam-attempts/att_9xK2mP7qR4/review");

    fireEvent.click(screen.getByRole("button", { name: /Làm mới/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Invalid date range: toDate < fromDate -> inline role="alert" (#1009)
    fireEvent.change(screen.getByLabelText("Đến ngày"), {
      target: { value: "2026-11-10" },
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu"
    );
  });

  it("ScoreTrendChart separates ETS 0-990 and Accuracy % toggles cleanly (PMR 033 #4)", () => {
    render(<ScoreTrendChart items={[]} />);
    expect(
      screen.getByRole("button", { name: /Điểm TOEIC \(0–990\)/i })
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Độ chính xác \(%\)/i }));
    expect(
      screen.getByText(/Cần tối thiểu 2 bài thi đã hoàn thành/i)
    ).toBeTruthy();
  });
});
