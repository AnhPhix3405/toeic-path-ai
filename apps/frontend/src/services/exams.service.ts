import apiClient from "./api-client";
import {
  AddExamQuestionsDto,
  AutoGenerateExamDto,
  ChangeExamStatusDto,
  ConfigureExamSectionsDto,
  CreateExamDto,
  ExamDetail,
  ExamOverview,
  ExamPublishResult,
  ExamStructure,
  PaginatedManageExams,
  PaginatedPublicExams,
  QueryExamsParams,
  QueryManageExamsParams,
  ReorderExamQuestionsDto,
  UpdateExamDto,
} from "@/types/exam";

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

export const examsService = {
  /**
   * 1. POST /api/v1/exams (UC16)
   */
  async createExam(dto: CreateExamDto): Promise<ExamDetail> {
    const response = await apiClient.post<ExamDetail>("/exams", dto);
    return unwrapResponse<ExamDetail>(response);
  },

  /**
   * 2. GET /api/v1/exams/:id/manage (UC16)
   */
  async getManageExamDetail(id: string): Promise<ExamDetail> {
    const response = await apiClient.get<ExamDetail>(`/exams/${id}/manage`);
    return unwrapResponse<ExamDetail>(response);
  },

  /**
   * 3. PATCH /api/v1/exams/:id (UC16)
   */
  async updateExam(id: string, dto: UpdateExamDto): Promise<ExamDetail> {
    const response = await apiClient.patch<ExamDetail>(`/exams/${id}`, dto);
    return unwrapResponse<ExamDetail>(response);
  },

  /**
   * 4. DELETE /api/v1/exams/:id (UC16)
   */
  async deleteExam(
    id: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/exams/${id}`);
    return unwrapResponse<{ success: boolean; message: string }>(response);
  },

  /**
   * 5. GET /api/v1/exams/:id/structure (UC17)
   */
  async getExamStructure(id: string): Promise<ExamStructure> {
    const response = await apiClient.get<ExamStructure>(
      `/exams/${id}/structure`
    );
    return unwrapResponse<ExamStructure>(response);
  },

  /**
   * 6. POST /api/v1/exams/:id/sections (UC17)
   */
  async configureSections(
    id: string,
    dto: ConfigureExamSectionsDto
  ): Promise<ExamStructure> {
    const response = await apiClient.post<ExamStructure>(
      `/exams/${id}/sections`,
      dto
    );
    return unwrapResponse<ExamStructure>(response);
  },

  /**
   * 7. POST /api/v1/exams/:id/questions (UC17)
   */
  async addQuestions(
    id: string,
    dto: AddExamQuestionsDto
  ): Promise<ExamStructure> {
    const response = await apiClient.post<ExamStructure>(
      `/exams/${id}/questions`,
      dto
    );
    return unwrapResponse<ExamStructure>(response);
  },

  /**
   * 8. PUT /api/v1/exams/:id/questions/reorder (UC17)
   */
  async reorderQuestions(
    id: string,
    dto: ReorderExamQuestionsDto
  ): Promise<ExamStructure> {
    const response = await apiClient.put<ExamStructure>(
      `/exams/${id}/questions/reorder`,
      dto
    );
    return unwrapResponse<ExamStructure>(response);
  },

  /**
   * 9. DELETE /api/v1/exams/:id/questions/:questionId?version=... (UC17)
   */
  async removeQuestion(
    id: string,
    questionId: string,
    version: number
  ): Promise<ExamStructure> {
    const response = await apiClient.delete<ExamStructure>(
      `/exams/${id}/questions/${questionId}`,
      {
        params: { version },
      }
    );
    return unwrapResponse<ExamStructure>(response);
  },

  /**
   * 10. POST /api/v1/exams/:id/auto-generate (UC17)
   */
  async autoGenerate(
    id: string,
    dto: AutoGenerateExamDto
  ): Promise<ExamStructure> {
    const response = await apiClient.post<ExamStructure>(
      `/exams/${id}/auto-generate`,
      dto
    );
    return unwrapResponse<ExamStructure>(response);
  },

  /**
   * 11. POST /api/v1/exams/:id/publish (UC18)
   */
  async publishExam(
    id: string,
    dto: ChangeExamStatusDto
  ): Promise<ExamPublishResult> {
    const response = await apiClient.post<ExamPublishResult>(
      `/exams/${id}/publish`,
      dto
    );
    return unwrapResponse<ExamPublishResult>(response);
  },

  /**
   * 12. POST /api/v1/exams/:id/unpublish (UC18)
   */
  async unpublishExam(
    id: string,
    dto: ChangeExamStatusDto
  ): Promise<ExamPublishResult> {
    const response = await apiClient.post<ExamPublishResult>(
      `/exams/${id}/unpublish`,
      dto
    );
    return unwrapResponse<ExamPublishResult>(response);
  },

  /**
   * 13. POST /api/v1/exams/:id/close (UC18)
   */
  async closeExam(
    id: string,
    dto: ChangeExamStatusDto
  ): Promise<ExamPublishResult> {
    const response = await apiClient.post<ExamPublishResult>(
      `/exams/${id}/close`,
      dto
    );
    return unwrapResponse<ExamPublishResult>(response);
  },

  /**
   * 14. POST /api/v1/exams/:id/archive (UC18)
   */
  async archiveExam(
    id: string,
    dto: ChangeExamStatusDto
  ): Promise<ExamPublishResult> {
    const response = await apiClient.post<ExamPublishResult>(
      `/exams/${id}/archive`,
      dto
    );
    return unwrapResponse<ExamPublishResult>(response);
  },

  /**
   * 15a. GET /api/v1/exams/manage (UC19 - Teacher/Admin Management Catalog)
   */
  async getManageExams(
    params?: QueryManageExamsParams
  ): Promise<PaginatedManageExams> {
    const response = await apiClient.get<PaginatedManageExams>(
      "/exams/manage",
      {
        params,
        paramsSerializer: {
          indexes: null,
        },
      }
    );
    return unwrapResponse<PaginatedManageExams>(response);
  },

  /**
   * 15b. GET /api/v1/exams (UC19 - Public Catalog for Student/Guest)
   */
  async getPublicExams(
    params?: QueryExamsParams
  ): Promise<PaginatedPublicExams> {
    const response = await apiClient.get<PaginatedPublicExams>("/exams", {
      params,
      paramsSerializer: {
        indexes: null,
      },
    });
    return unwrapResponse<PaginatedPublicExams>(response);
  },

  /**
   * 15c. GET /api/v1/exams/:id/overview (UC19 - Zero Answer Leakage Overview)
   */
  async getExamOverview(id: string): Promise<ExamOverview> {
    const response = await apiClient.get<ExamOverview>(
      `/exams/${id}/overview`
    );
    return unwrapResponse<ExamOverview>(response);
  },
};
