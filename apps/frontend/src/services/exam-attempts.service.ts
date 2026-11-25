import apiClient from "./api-client";
import {
  AbandonAttemptResponse,
  BatchSaveAnswersDto,
  BatchSaveAnswersResponse,
  CreateExamAttemptDto,
  ExamAttemptOverview,
  ExamAttemptQuestionsResponse,
  ExamAttemptResult,
  ExamAttemptReviewResponse,
  ExamAttemptSummary,
  PaginatedExamAttemptHistory,
  QueryAttemptHistoryParams,
  QueryAttemptQuestionsParams,
  QueryAttemptReviewParams,
  SaveAnswerDto,
  SaveAnswerResponse,
  SubmitExamAttemptResponse,
} from "@/types/exam-attempt";

function unwrapResponse<T>(res: unknown): T {
  if (res === null || res === undefined) {
    return res as T;
  }
  if (Array.isArray(res)) {
    return res as T;
  }
  if (typeof res === "object") {
    if ("data" in res && (res as { data: unknown }).data !== undefined) {
      if (!("total" in res && "page" in res)) {
        return (res as { data: T }).data;
      }
    }
  }
  return res as T;
}

export const examAttemptsService = {
  /**
   * 1. POST /api/v1/exam-attempts (UC20)
   * Returns 201 Created (new attempt) or 200 OK (isResumed: true on same exam).
   * Throws 409 Conflict (ERR_ANOTHER_EXAM_IN_PROGRESS) if another exam is active.
   */
  async startAttempt(dto: CreateExamAttemptDto): Promise<ExamAttemptSummary> {
    const response = await apiClient.post<ExamAttemptSummary>(
      "/exam-attempts",
      dto
    );
    return unwrapResponse<ExamAttemptSummary>(response);
  },

  /**
   * 2. POST /api/v1/exam-attempts/:id/abandon (UC20)
   */
  async abandonAttempt(attemptId: string): Promise<AbandonAttemptResponse> {
    const response = await apiClient.post<AbandonAttemptResponse>(
      `/exam-attempts/${attemptId}/abandon`
    );
    return unwrapResponse<AbandonAttemptResponse>(response);
  },

  /**
   * 3. GET /api/v1/exam-attempts/:id (UC21 & UC24)
   * Lightweight overview with serverTimeNow, remainingSeconds, isExpired, questionsProgress.
   */
  async getAttemptOverview(attemptId: string): Promise<ExamAttemptOverview> {
    const response = await apiClient.get<ExamAttemptOverview>(
      `/exam-attempts/${attemptId}`
    );
    return unwrapResponse<ExamAttemptOverview>(response);
  },

  /**
   * 4. GET /api/v1/exam-attempts/:id/questions (UC21)
   * Deduplicated questionGroups + continuous orderIndex 1..N questions.
   * Omit params.partNumber to prefetch the entire attempt in one call.
   */
  async getAttemptQuestions(
    attemptId: string,
    params?: QueryAttemptQuestionsParams
  ): Promise<ExamAttemptQuestionsResponse> {
    const response = await apiClient.get<ExamAttemptQuestionsResponse>(
      `/exam-attempts/${attemptId}/questions`,
      { params }
    );
    return unwrapResponse<ExamAttemptQuestionsResponse>(response);
  },

  /**
   * 5. PUT /api/v1/exam-attempts/:id/answers (UC22)
   * Conditional single-question upsert respecting 3-state selectedOptionId & delta timeSpentSeconds.
   */
  async saveAnswer(
    attemptId: string,
    dto: SaveAnswerDto
  ): Promise<SaveAnswerResponse> {
    const response = await apiClient.put<SaveAnswerResponse>(
      `/exam-attempts/${attemptId}/answers`,
      dto
    );
    return unwrapResponse<SaveAnswerResponse>(response);
  },

  /**
   * 6. PUT /api/v1/exam-attempts/:id/answers/batch (UC22)
   * Offline recovery batch sync (1..200 items with clientAnsweredAt).
   */
  async batchSaveAnswers(
    attemptId: string,
    dto: BatchSaveAnswersDto
  ): Promise<BatchSaveAnswersResponse> {
    const response = await apiClient.put<BatchSaveAnswersResponse>(
      `/exam-attempts/${attemptId}/answers/batch`,
      dto
    );
    return unwrapResponse<BatchSaveAnswersResponse>(response);
  },

  /**
   * 7. POST /api/v1/exam-attempts/:id/submit (UC23 & UC25)
   */
  async submitAttempt(attemptId: string): Promise<SubmitExamAttemptResponse> {
    const response = await apiClient.post<SubmitExamAttemptResponse>(
      `/exam-attempts/${attemptId}/submit`
    );
    return unwrapResponse<SubmitExamAttemptResponse>(response);
  },

  /**
   * 8. GET /api/v1/exam-attempts/:id/result (UC26)
   */
  async getAttemptResult(attemptId: string): Promise<ExamAttemptResult> {
    const response = await apiClient.get<ExamAttemptResult>(
      `/exam-attempts/${attemptId}/result`
    );
    return unwrapResponse<ExamAttemptResult>(response);
  },

  /**
   * 9. GET /api/v1/exam-attempts/:id/review (UC27 & UC28)
   */
  async getAttemptReview(
    attemptId: string,
    params?: QueryAttemptReviewParams
  ): Promise<ExamAttemptReviewResponse> {
    const response = await apiClient.get<ExamAttemptReviewResponse>(
      `/exam-attempts/${attemptId}/review`,
      { params }
    );
    return unwrapResponse<ExamAttemptReviewResponse>(response);
  },

  /**
   * 10. GET /api/v1/exam-attempts/history (UC27)
   */
  async getAttemptHistory(
    params?: QueryAttemptHistoryParams
  ): Promise<PaginatedExamAttemptHistory> {
    const response = await apiClient.get<PaginatedExamAttemptHistory>(
      "/exam-attempts/history",
      { params }
    );
    return unwrapResponse<PaginatedExamAttemptHistory>(response);
  },
};
