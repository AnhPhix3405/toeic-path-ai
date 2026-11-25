import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubmitAttemptModal } from "@/features/exam-attempts/components/room/submit-attempt-modal";
import { ScoreReportView } from "@/features/exam-attempts/components/result/score-report-view";
import { ExamAttemptResult } from "@/types/exam-attempt";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("Sprint 7 Task 2 — SubmitAttemptModal & ScoreReportView (Recharts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
  });

  it("Review Focus #1: SubmitAttemptModal displays answered/unanswered/marked counts, offline warning, and fires onConfirmSubmit", () => {
    const onConfirm = vi.fn();
    render(
      <SubmitAttemptModal
        isOpen={true}
        totalQuestions={200}
        answeredCount={185}
        markedCount={7}
        pendingOfflineCount={3}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirmSubmit={onConfirm}
      />
    );

    expect(screen.getByText("185")).toBeTruthy();
    expect(screen.getByText("15")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText(/3 đáp án chờ đồng bộ/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Xác nhận nộp bài/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Review Focus #2: ScoreReportView renders ETS 10-990 scores, Pass badge, and pretty review CTA", () => {
    const etsResult: ExamAttemptResult = {
      attemptId: "50000000-0000-4000-8000-000000000001",
      examId: "10000000-0000-4000-8000-000000000001",
      examTitle: "ETS TOEIC 2026 Test 01",
      mode: "full_exam",
      selectedParts: null,
      scoreConversionType: "DEFAULT_ETS",
      status: "submitted",
      startedAt: "2026-11-24T08:00:00.000Z",
      submittedAt: "2026-11-24T09:50:00.000Z",
      gradedAt: "2026-11-24T09:50:00.000Z",
      durationSpentSeconds: 6600,
      totalScore: 785,
      listeningScore: 410,
      readingScore: 375,
      passingScore: 650,
      isPassed: true,
      totalQuestions: 200,
      correctCount: 158,
      wrongCount: 32,
      skippedCount: 10,
      accuracyPercentage: 79,
      partBreakdown: [
        {
          partNumber: 1,
          total: 6,
          correct: 5,
          wrong: 1,
          skipped: 0,
          accuracy: 83.3,
          avgTimeSeconds: 15,
        },
      ],
      skillBreakdown: [
        {
          skillId: "s1",
          skillCode: "GRAMMAR",
          skillName: "Ngữ pháp",
          total: 20,
          correct: 16,
          wrong: 4,
          skipped: 0,
          accuracy: 80,
        },
      ],
    };

    render(
      <ScoreReportView
        result={etsResult}
        attemptSlugOrId="att_9xK2mP7qR4"
      />
    );

    expect(screen.getByText("785")).toBeTruthy();
    expect(screen.getByText("410")).toBeTruthy();
    expect(screen.getByText("375")).toBeTruthy();
    expect(screen.getByText("Đạt yêu cầu")).toBeTruthy();

    const reviewLink = screen.getByRole("link", {
      name: /Xem lại đáp án & Lời giải chi tiết/i,
    });
    expect(reviewLink.getAttribute("href")).toBe(
      "/exam-attempts/att_9xK2mP7qR4/review"
    );
  });

  it("Review Focus #2 & #4: ScoreReportView renders accuracyPercentage cleanly when totalScore is null and shows empty chart states", () => {
    const rawResult: ExamAttemptResult = {
      attemptId: "50000000-0000-4000-8000-000000000002",
      examId: "10000000-0000-4000-8000-000000000002",
      examTitle: "Mini Part 5 Practice",
      mode: "part_practice",
      selectedParts: [5],
      scoreConversionType: "RAW_PERCENTAGE",
      status: "submitted",
      startedAt: "2026-11-24T08:00:00.000Z",
      submittedAt: "2026-11-24T08:15:00.000Z",
      gradedAt: "2026-11-24T08:15:00.000Z",
      durationSpentSeconds: 900,
      totalScore: null,
      listeningScore: null,
      readingScore: null,
      passingScore: null,
      isPassed: null,
      totalQuestions: 20,
      correctCount: 17,
      wrongCount: 3,
      skippedCount: 0,
      accuracyPercentage: 85,
      partBreakdown: [],
      skillBreakdown: [],
    };

    const { container } = render(
      <ScoreReportView
        result={rawResult}
        attemptSlugOrId="att_Practice01"
      />
    );

    expect(screen.getByText("85.0%")).toBeTruthy();
    expect(container.textContent).not.toContain("null / 990");
    expect(container.textContent).not.toContain("NaN");
    expect(
      screen.getByText(/Chưa có dữ liệu phân tích theo từng Part/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/chưa được gắn nhãn kỹ năng chi tiết/i)
    ).toBeTruthy();
  });
});
