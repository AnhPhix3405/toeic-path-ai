import apiClient from "./api-client";
import {
  ApproveQuestionDto,
  BatchApproveQuestionsDto,
  BatchReviewResponse,
  PaginatedReviewQueue,
  QueryReviewQueueParams,
  QuestionHistoryItem,
  QuestionReviewLogItem,
  QuickFixApproveDto,
  RejectQuestionDto,
  RequestRevisionDto,
  ReviewActionResponse,
} from "@/types/question-review";

/**
 * Helper to unwrap responses from apiClient.
 * Preserves paginated objects ({ items, total, page, limit }) and unwraps { data: ... } envelopes.
 */
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

export const questionReviewsService = {
  /**
   * GET /api/v1/questions/reviews/queue
   * Uses custom paramsSerializer (without `[]` brackets and duplicating single-item topicIds)
   * so Express 5 simple query parser produces a valid string[] for @IsArray() @IsUUID('4', { each: true }).
   */
  async getReviewQueue(
    params?: QueryReviewQueueParams
  ): Promise<PaginatedReviewQueue> {
    const normalizedParams = params
      ? {
          ...params,
          topicIds:
            params.topicIds && params.topicIds.length === 1
              ? [params.topicIds[0], params.topicIds[0]]
              : params.topicIds && params.topicIds.length > 0
              ? params.topicIds
              : undefined,
        }
      : undefined;

    const response = await apiClient.get<PaginatedReviewQueue>(
      "/questions/reviews/queue",
      {
        params: normalizedParams,
        paramsSerializer: {
          indexes: null,
        },
      }
    );
    return unwrapResponse<PaginatedReviewQueue>(response);
  },

  /**
   * POST /api/v1/questions/reviews/:id/approve
   */
  async approveQuestion(
    id: string,
    dto: ApproveQuestionDto
  ): Promise<ReviewActionResponse> {
    const response = await apiClient.post<ReviewActionResponse>(
      `/questions/reviews/${id}/approve`,
      dto
    );
    return unwrapResponse<ReviewActionResponse>(response);
  },

  /**
   * POST /api/v1/questions/reviews/:id/request-revision
   */
  async requestRevision(
    id: string,
    dto: RequestRevisionDto
  ): Promise<ReviewActionResponse> {
    const response = await apiClient.post<ReviewActionResponse>(
      `/questions/reviews/${id}/request-revision`,
      dto
    );
    return unwrapResponse<ReviewActionResponse>(response);
  },

  /**
   * POST /api/v1/questions/reviews/:id/reject
   */
  async rejectQuestion(
    id: string,
    dto: RejectQuestionDto
  ): Promise<ReviewActionResponse> {
    const response = await apiClient.post<ReviewActionResponse>(
      `/questions/reviews/${id}/reject`,
      dto
    );
    return unwrapResponse<ReviewActionResponse>(response);
  },

  /**
   * PUT /api/v1/questions/reviews/:id/quick-fix
   */
  async quickFixApprove(
    id: string,
    dto: QuickFixApproveDto
  ): Promise<ReviewActionResponse> {
    const response = await apiClient.put<ReviewActionResponse>(
      `/questions/reviews/${id}/quick-fix`,
      dto
    );
    return unwrapResponse<ReviewActionResponse>(response);
  },

  /**
   * POST /api/v1/questions/reviews/batch-approve
   */
  async batchApprove(
    dto: BatchApproveQuestionsDto
  ): Promise<BatchReviewResponse> {
    const response = await apiClient.post<BatchReviewResponse>(
      "/questions/reviews/batch-approve",
      dto
    );
    return unwrapResponse<BatchReviewResponse>(response);
  },

  /**
   * GET /api/v1/questions/reviews/:id/histories
   */
  async getQuestionHistories(id: string): Promise<QuestionHistoryItem[]> {
    const response = await apiClient.get<QuestionHistoryItem[]>(
      `/questions/reviews/${id}/histories`
    );
    return unwrapResponse<QuestionHistoryItem[]>(response) ?? [];
  },

  /**
   * GET /api/v1/questions/reviews/:id/logs
   */
  async getQuestionReviewLogs(id: string): Promise<QuestionReviewLogItem[]> {
    const response = await apiClient.get<QuestionReviewLogItem[]>(
      `/questions/reviews/${id}/logs`
    );
    return unwrapResponse<QuestionReviewLogItem[]>(response) ?? [];
  },
};
