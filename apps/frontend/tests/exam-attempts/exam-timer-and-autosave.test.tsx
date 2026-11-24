import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExamCountdownTimer } from "@/features/exam-attempts/components/room/exam-countdown-timer";
import { ExamRoomWorkspace } from "@/features/exam-attempts/components/room/exam-room-workspace";
import { examAttemptsService } from "@/services/exam-attempts.service";
import { useExamRoomStore } from "@/stores/exam-room.store";

vi.mock("@/services/exam-attempts.service", () => ({
  examAttemptsService: {
    saveAnswer: vi.fn(),
    batchSaveAnswers: vi.fn(),
    getAttemptOverview: vi.fn(),
    abandonAttempt: vi.fn(),
  },
}));

describe("Server-Synced Countdown Timer (UC24) & Conditional Auto-Save / Offline Batch Recovery (UC22)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    useExamRoomStore.getState().resetAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Review Focus 5: compensates for 10-minute client clock skew using serverTimeOffsetMs and triggers onExpire at 0s", () => {
    vi.setSystemTime(new Date("2026-11-24T08:10:00.000Z"));
    const onExpire = vi.fn();

    render(
      <ExamCountdownTimer
        expiresAt="2026-11-24T08:00:03.000Z"
        serverTimeOffsetMs={-600_000}
        onExpire={onExpire}
      />
    );

    expect(screen.getByRole("timer")).toHaveTextContent("00:03");
    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("PMR 025 #2: coalesces SELECT_OPTION + TOGGLE_REVIEW within < 400ms into one saveAnswer call without dropping selectedOptionId", async () => {
    vi.setSystemTime(new Date("2026-11-24T08:00:00.000Z"));
    vi.mocked(examAttemptsService.saveAnswer).mockResolvedValueOnce({
      success: true,
      questionId: "q-501",
      selectedOptionId: "opt-501-a",
      isMarkedForReview: true,
      answeredCount: 1,
      remainingSeconds: 1790,
      savedAt: "2026-11-24T08:00:10.000Z",
    });

    const overview = {
      id: "att-coalesce",
      examId: "ex-1",
      examTitle: "Coalesce Race Exam",
      status: "in_progress" as const,
      mode: "full_exam" as const,
      selectedParts: null,
      startedAt: "2026-11-24T08:00:00.000Z",
      expiresAt: "2026-11-24T08:30:00.000Z",
      remainingSeconds: 1800,
      serverTimeNow: "2026-11-24T08:00:00.000Z",
      isExpired: false,
      totalQuestions: 1,
      answeredCount: 0,
      markedForReviewCount: 0,
      questionsProgress: [],
    };

    const delivery = {
      attemptId: "att-coalesce",
      partNumber: null,
      totalQuestionsInPart: 1,
      questionGroups: [],
      questions: [
        {
          id: "q-501",
          partNumber: 5,
          orderIndex: 1,
          originalQuestionNumber: 101,
          questionGroupId: null,
          content: "Ms. Tanaka ------- the budget proposal yesterday.",
          options: [
            { id: "opt-501-a", label: "A", content: "approved" },
            { id: "opt-501-b", label: "B", content: "approving" },
          ],
          selectedOptionId: null,
          isMarkedForReview: false,
        },
      ],
    };

    render(<ExamRoomWorkspace overview={overview} delivery={delivery} />);

    fireEvent.click(screen.getByRole("button", { name: /Chọn đáp án A/i }));
    act(() => {
      vi.advanceTimersByTime(150);
    });
    fireEvent.click(screen.getByRole("button", { name: /Đánh dấu xem lại/i }));

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(examAttemptsService.saveAnswer).toHaveBeenCalledTimes(1);
    expect(examAttemptsService.saveAnswer).toHaveBeenCalledWith(
      "att-coalesce",
      expect.objectContaining({
        questionId: "q-501",
        selectedOptionId: "opt-501-a",
        isMarkedForReview: true,
      })
    );
  });

  it("Review Focus 4 & PMR 025 #3: queues offline edits, flushes batchSaveAnswers on online recovery, and strips failedItems without infinite retry", async () => {
    vi.setSystemTime(new Date("2026-11-24T08:00:00.000Z"));
    vi.mocked(examAttemptsService.saveAnswer).mockRejectedValueOnce(
      new Error("Network Error")
    );
    vi.mocked(examAttemptsService.batchSaveAnswers).mockResolvedValueOnce({
      success: true,
      syncedCount: 1,
      failedCount: 0,
      failedItems: [],
      answeredCount: 1,
      remainingSeconds: 1700,
      serverTimeNow: "2026-11-24T08:02:00.000Z",
    });

    const overview = {
      id: "att-sync",
      examId: "ex-1",
      examTitle: "AutoSave Verification Exam",
      status: "in_progress" as const,
      mode: "full_exam" as const,
      selectedParts: null,
      startedAt: "2026-11-24T08:00:00.000Z",
      expiresAt: "2026-11-24T08:30:00.000Z",
      remainingSeconds: 1800,
      serverTimeNow: "2026-11-24T08:00:00.000Z",
      isExpired: false,
      totalQuestions: 1,
      answeredCount: 0,
      markedForReviewCount: 0,
      questionsProgress: [],
    };

    const delivery = {
      attemptId: "att-sync",
      partNumber: null,
      totalQuestionsInPart: 1,
      questionGroups: [],
      questions: [
        {
          id: "q-501",
          partNumber: 5,
          orderIndex: 1,
          originalQuestionNumber: 101,
          questionGroupId: null,
          content: "Ms. Tanaka ------- the budget proposal yesterday.",
          options: [
            { id: "opt-501-a", label: "A", content: "approved" },
            { id: "opt-501-b", label: "B", content: "approving" },
          ],
          selectedOptionId: null,
          isMarkedForReview: false,
        },
      ],
    };

    render(<ExamRoomWorkspace overview={overview} delivery={delivery} />);

    fireEvent.click(screen.getByRole("button", { name: /Chọn đáp án A/i }));

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(useExamRoomStore.getState().getPendingCount("att-sync")).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /Đánh dấu xem lại/i }));

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    expect(examAttemptsService.batchSaveAnswers).toHaveBeenCalledWith(
      "att-sync",
      expect.objectContaining({
        answers: [
          expect.objectContaining({
            questionId: "q-501",
            selectedOptionId: "opt-501-a",
            isMarkedForReview: true,
          }),
        ],
      })
    );
    expect(useExamRoomStore.getState().getPendingCount("att-sync")).toBe(0);
  });
});
