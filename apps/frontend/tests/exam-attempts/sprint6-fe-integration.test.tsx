import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

describe("Sprint 6 Frontend End-to-End Integration Flows (Tasks 1–5)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    useExamRoomStore.getState().resetAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseOverview = {
    id: "att-e2e-1",
    examId: "30000000-0000-4000-8000-000000000001",
    examTitle: "Sprint 6 E2E Integration Exam",
    status: "in_progress" as const,
    mode: "part_practice" as const,
    selectedParts: [5],
    startedAt: "2026-11-24T08:00:00.000Z",
    expiresAt: "2026-11-24T08:00:05.000Z",
    remainingSeconds: 5,
    serverTimeNow: "2026-11-24T08:00:00.000Z",
    isExpired: false,
    totalQuestions: 2,
    answeredCount: 0,
    markedForReviewCount: 0,
    questionsProgress: [],
  };

  const baseDelivery = {
    attemptId: "att-e2e-1",
    partNumber: null,
    totalQuestionsInPart: 2,
    questionGroups: [],
    questions: [
      {
        id: "q-e2e-1",
        partNumber: 5,
        orderIndex: 1,
        originalQuestionNumber: 101,
        questionGroupId: null,
        content: "The quarterly sales report ------- by Friday.",
        options: [
          { id: "opt-1a", label: "A", content: "is due" },
          { id: "opt-1b", label: "B", content: "are due" },
        ],
        selectedOptionId: null,
        isMarkedForReview: false,
      },
      {
        id: "q-e2e-2",
        partNumber: 5,
        orderIndex: 2,
        originalQuestionNumber: 102,
        questionGroupId: null,
        content: "Please submit all travel receipts ------- accounting.",
        options: [
          { id: "opt-2a", label: "A", content: "to" },
          { id: "opt-2b", label: "B", content: "at" },
        ],
        selectedOptionId: null,
        isMarkedForReview: false,
      },
    ],
  };

  it("Journey 1 (F5 Hydration + PMR 025 #1): preserves un-synced offline answers when remounting ExamRoomWorkspace", async () => {
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
      remainingSeconds: 4,
      serverTimeNow: "2026-11-24T08:00:01.000Z",
    });

    const { unmount } = render(
      <ExamRoomWorkspace overview={baseOverview} delivery={baseDelivery} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Chọn đáp án A/i }));
    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    // Unmount and remount simulating F5 reload while server delivery still has selectedOptionId: null
    unmount();
    render(
      <ExamRoomWorkspace overview={baseOverview} delivery={baseDelivery} />
    );

    // Local un-synced answer stays preserved & auto-flushes on remount
    expect(
      useExamRoomStore.getState().sessions["att-e2e-1"]?.answers["q-e2e-1"]
        ?.selectedOptionId
    ).toBe("opt-1a");
    expect(examAttemptsService.batchSaveAnswers).toHaveBeenCalledTimes(1);
  });

  it("Journey 2 (PMR 025 #2 Grace-Period Expiry Flush + Lock): flushes pending answer on timer expiry and locks room behind ExamExpiredOverlay", async () => {
    vi.setSystemTime(new Date("2026-11-24T08:00:00.000Z"));
    vi.mocked(examAttemptsService.batchSaveAnswers).mockResolvedValueOnce({
      success: true,
      syncedCount: 1,
      failedCount: 0,
      failedItems: [],
      answeredCount: 1,
      remainingSeconds: 0,
      serverTimeNow: "2026-11-24T08:00:05.000Z",
    });

    render(
      <ExamRoomWorkspace overview={baseOverview} delivery={baseDelivery} />
    );

    // Student clicks option at 00:01 remaining (< 400ms before expiry!)
    act(() => {
      vi.advanceTimersByTime(4800);
    });
    fireEvent.click(screen.getByRole("button", { name: /Chọn đáp án A/i }));

    // 200ms later timer hits 00:00 -> flushOnExpire cancels debounce & flushes batch immediately
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(examAttemptsService.batchSaveAnswers).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("heading", { name: /Đã hết thời gian làm bài/i })
    ).toBeInTheDocument();
  });
});
