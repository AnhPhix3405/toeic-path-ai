import apiClient from "./api-client";
import {
  CreateQuestionGroupDto,
  QuestionGroup,
  UpdateQuestionGroupDto,
} from "@/types/question";

/**
 * Helper to unwrap responses from apiClient for question-groups.
 * Handles direct DTOs, direct arrays, and envelope structures ({ success: true, data: ... }).
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
      return (res as { data: T }).data;
    }
  }
  return res as T;
}

export const questionGroupsService = {
  async getQuestionGroups(): Promise<QuestionGroup[]> {
    const response = await apiClient.get<QuestionGroup[]>("/question-groups");
    return unwrapResponse<QuestionGroup[]>(response) ?? [];
  },

  async getQuestionGroup(id: string): Promise<QuestionGroup> {
    const response = await apiClient.get<QuestionGroup>(`/question-groups/${id}`);
    return unwrapResponse<QuestionGroup>(response);
  },

  async createQuestionGroup(dto: CreateQuestionGroupDto): Promise<QuestionGroup> {
    const response = await apiClient.post<QuestionGroup>("/question-groups", dto);
    return unwrapResponse<QuestionGroup>(response);
  },

  async updateQuestionGroup(
    id: string,
    dto: UpdateQuestionGroupDto
  ): Promise<QuestionGroup> {
    const response = await apiClient.patch<QuestionGroup>(
      `/question-groups/${id}`,
      dto
    );
    return unwrapResponse<QuestionGroup>(response);
  },

  async deleteQuestionGroup(id: string): Promise<void> {
    await apiClient.delete(`/question-groups/${id}`);
  },
};
