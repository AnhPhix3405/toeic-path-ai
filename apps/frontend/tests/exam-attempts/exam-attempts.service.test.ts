import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "@/services/api-client";
import { examAttemptsService } from "@/services/exam-attempts.service";
import {
  createExamAttemptSchema,
  buildConditionalSavePayload,
  extractAnotherExamConflict,
  estimatePartPracticeMinutes,
} from "@/lib/validations/exam-attempt.schema";
import { useExamRoomStore } from "@/stores/exam-room.store";

vi.mock("@/services/api-client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe("examAttemptsService (6 endpoints #222), Conditional Save & Offline Queue Store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useExamRoomStore.getState().resetAll();
  });

  it("calls all 6 ExamAttemptsController endpoints with exact methods, paths, and payloads", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ attemptId: "att-1", isResumed: true } as never)
      .mockResolvedValueOnce({
        success: true,
        message: "Đã hủy bài thi thành công",
      } as never);
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        id: "att-1",
        remainingSeconds: 3600,
        isExpired: false,
      } as never)
      .mockResolvedValueOnce({
        attemptId: "att-1",
        questionGroups: [],
        questions: [],
      } as never);
    vi.mocked(apiClient.put)
      .mockResolvedValueOnce({ success: true, answeredCount: 1 } as never)
      .mockResolvedValueOnce({
        success: true,
        syncedCount: 2,
        failedCount: 0,
        failedItems: [],
      } as never);

    const started = await examAttemptsService.startAttempt({
      examId: "30000000-0000-4000-8000-000000000001",
      mode: "part_practice",
      selectedParts: [5, 6],
    });
    expect(started.isResumed).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith("/exam-attempts", {
      examId: "30000000-0000-4000-8000-000000000001",
      mode: "part_practice",
      selectedParts: [5, 6],
    });

    await examAttemptsService.abandonAttempt("att-1");
    expect(apiClient.post).toHaveBeenCalledWith("/exam-attempts/att-1/abandon");

    await examAttemptsService.getAttemptOverview("att-1");
    expect(apiClient.get).toHaveBeenCalledWith("/exam-attempts/att-1");

    await examAttemptsService.getAttemptQuestions("att-1");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/exam-attempts/att-1/questions",
      { params: undefined }
    );

    await examAttemptsService.saveAnswer("att-1", {
      questionId: "q-1",
      selectedOptionId: "opt-a",
      timeSpentSeconds: 12,
    });
    expect(apiClient.put).toHaveBeenCalledWith("/exam-attempts/att-1/answers", {
      questionId: "q-1",
      selectedOptionId: "opt-a",
      timeSpentSeconds: 12,
    });

    await examAttemptsService.batchSaveAnswers("att-1", {
      answers: [
        { questionId: "q-1", selectedOptionId: "opt-a", timeSpentSeconds: 12 },
      ],
    });
    expect(apiClient.put).toHaveBeenCalledWith(
      "/exam-attempts/att-1/answers/batch",
      {
        answers: [
          {
            questionId: "q-1",
            selectedOptionId: "opt-a",
            timeSpentSeconds: 12,
          },
        ],
      }
    );
  });

  it("Review Focus 1: omits selectedOptionId key on TOGGLE_REVIEW and clamps delta timeSpentSeconds to 0..7200", () => {
    const togglePayload = buildConditionalSavePayload({
      questionId: "20000000-0000-4000-8000-000000000001",
      action: { type: "TOGGLE_REVIEW", isMarkedForReview: true },
      deltaTimeSpentSeconds: 9500.8,
    });

    expect("selectedOptionId" in togglePayload).toBe(false);
    expect(togglePayload).toEqual({
      questionId: "20000000-0000-4000-8000-000000000001",
      isMarkedForReview: true,
      timeSpentSeconds: 7200,
    });

    const clearPayload = buildConditionalSavePayload({
      questionId: "20000000-0000-4000-8000-000000000001",
      action: { type: "CLEAR_OPTION" },
      deltaTimeSpentSeconds: -5,
    });
    expect(clearPayload.selectedOptionId).toBeNull();
    expect(clearPayload.timeSpentSeconds).toBe(0);
  });

  it("validates part_practice non-empty selectedParts (#1009), estimates deterministic duration, and extracts 409 ERR_ANOTHER_EXAM_IN_PROGRESS", () => {
    const invalid = createExamAttemptSchema.safeParse({
      examId: "30000000-0000-4000-8000-000000000001",
      mode: "part_practice",
      selectedParts: [],
    });
    expect(invalid.success).toBe(false);

    expect(
      estimatePartPracticeMinutes(
        [
          { partNumber: 1, questionCount: 6, suggestedDuration: null },
          { partNumber: 5, questionCount: 10, suggestedDuration: null },
        ],
        [1, 5]
      )
    ).toBe(11); // (6*45 + 10*36) = 630s -> ceil(10.5) = 11m

    const conflict = extractAnotherExamConflict({
      response: {
        status: 409,
        data: {
          errorCode: "ERR_ANOTHER_EXAM_IN_PROGRESS",
          message: "Bạn đang có một bài thi dở dang ở đề thi khác",
          attemptId: "att-old",
          examTitle: "ETS 2026 Test 01",
          startedAt: "2026-11-24T07:00:00.000Z",
          remainingSeconds: 1800,
        },
      },
    });
    expect(conflict?.attemptId).toBe("att-old");
    expect(conflict?.examTitle).toBe("ETS 2026 Test 01");

    // BUG-S6-UI-003 regression: normalized ApiError returned by api-client.ts
    const normalizedConflict = extractAnotherExamConflict({
      statusCode: 409,
      errorCode: "ERR_ANOTHER_EXAM_IN_PROGRESS",
      message: "Bạn đang có một bài thi dở dang ở đề thi khác",
      attemptId: "att-normalized-1",
      examTitle: "TEST_POSTMAN_SPR7_Raw_Exam",
      startedAt: "2026-11-24T12:00:00.000Z",
      remainingSeconds: 820,
    });
    expect(normalizedConflict?.attemptId).toBe("att-normalized-1");
    expect(normalizedConflict?.examTitle).toBe("TEST_POSTMAN_SPR7_Raw_Exam");
  });

  it("Review Focus 4 & PMR 025 #1: coalesces offline option selection + review toggle and preserves un-synced answers across F5 hydrateAttempt", () => {
    const store = useExamRoomStore.getState();
    store.hydrateAttempt({
      attemptId: "att-offline",
      expiresAt: "2026-11-24T10:00:00.000Z",
      serverTimeNow: "2026-11-24T08:00:00.000Z",
      questions: [
        {
          id: "q-101",
          partNumber: 5,
          orderIndex: 1,
          options: [{ id: "opt-c", label: "C", content: "delivered" }],
          selectedOptionId: null,
          isMarkedForReview: false,
        },
      ],
    });

    store.enqueueOfflineMutation({
      questionId: "q-101",
      selectedOptionId: "opt-c",
      timeSpentSeconds: 8,
      clientAnsweredAt: "2026-11-24T08:01:00.000Z",
    });
    store.enqueueOfflineMutation({
      questionId: "q-101",
      isMarkedForReview: true,
      timeSpentSeconds: 4,
      clientAnsweredAt: "2026-11-24T08:01:05.000Z",
    });

    const batchItems = useExamRoomStore
      .getState()
      .getPendingBatchPayload("att-offline");
    expect(batchItems).toHaveLength(1);
    expect(batchItems[0]).toMatchObject({
      questionId: "q-101",
      selectedOptionId: "opt-c",
      isMarkedForReview: true,
      timeSpentSeconds: 12,
      clientAnsweredAt: "2026-11-24T08:01:05.000Z",
    });

    // Simulate F5 reload where server still returns selectedOptionId: null
    useExamRoomStore.getState().hydrateAttempt({
      attemptId: "att-offline",
      expiresAt: "2026-11-24T10:00:00.000Z",
      serverTimeNow: "2026-11-24T08:02:00.000Z",
      questions: [
        {
          id: "q-101",
          partNumber: 5,
          orderIndex: 1,
          options: [{ id: "opt-c", label: "C", content: "delivered" }],
          selectedOptionId: null,
          isMarkedForReview: false,
        },
      ],
    });

    const hydratedAnswer =
      useExamRoomStore.getState().sessions["att-offline"]?.answers["q-101"];
    expect(hydratedAnswer?.selectedOptionId).toBe("opt-c");
    expect(hydratedAnswer?.isMarkedForReview).toBe(true);
  });
});
