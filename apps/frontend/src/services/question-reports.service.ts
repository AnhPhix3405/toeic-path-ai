import apiClient from "./api-client";
import {
  CreateQuestionReportDto,
  MyQuestionReportItem,
  PaginatedAdminQuestionReports,
  PaginatedMyQuestionReports,
  QueryMyQuestionReportsParams,
  QueryQuestionReportsParams,
  QuestionReportDetail,
  ResolveQuestionReportDto,
  ResolveQuestionReportResponse,
} from "@/types/question-report";

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

export const questionReportsService = {
  /**
   * 1. POST /api/v1/questions/:questionId/reports (UC29)
   * Canonical UUID required for questionId and optional attemptId.
   */
  async createReport(
    questionId: string,
    dto: CreateQuestionReportDto
  ): Promise<MyQuestionReportItem> {
    const response = await apiClient.post<MyQuestionReportItem>(
      `/questions/${questionId}/reports`,
      dto
    );
    return unwrapResponse<MyQuestionReportItem>(response);
  },

  /**
   * 2. GET /api/v1/question-reports/my (UC29)
   */
  async getMyReports(
    params?: QueryMyQuestionReportsParams
  ): Promise<PaginatedMyQuestionReports> {
    const response = await apiClient.get<PaginatedMyQuestionReports>(
      "/question-reports/my",
      { params }
    );
    return unwrapResponse<PaginatedMyQuestionReports>(response);
  },

  /**
   * 3. GET /api/v1/question-reports (UC49 — Teacher/Admin)
   */
  async getReportsForManagement(
    params?: QueryQuestionReportsParams
  ): Promise<PaginatedAdminQuestionReports> {
    const response = await apiClient.get<PaginatedAdminQuestionReports>(
      "/question-reports",
      { params }
    );
    return unwrapResponse<PaginatedAdminQuestionReports>(response);
  },

  /**
   * 4. GET /api/v1/question-reports/:id (UC49 — Teacher/Admin)
   */
  async getReportDetail(id: string): Promise<QuestionReportDetail> {
    const response = await apiClient.get<QuestionReportDetail>(
      `/question-reports/${id}`
    );
    return unwrapResponse<QuestionReportDetail>(response);
  },

  /**
   * 5. PATCH /api/v1/question-reports/:id/resolve (UC49 — Teacher/Admin)
   */
  async resolveReport(
    id: string,
    dto: ResolveQuestionReportDto
  ): Promise<ResolveQuestionReportResponse> {
    const response = await apiClient.patch<ResolveQuestionReportResponse>(
      `/question-reports/${id}/resolve`,
      dto
    );
    return unwrapResponse<ResolveQuestionReportResponse>(response);
  },
};
