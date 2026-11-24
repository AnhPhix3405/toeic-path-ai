import apiClient from "./api-client";
import {
  AssignQuestionGroupDto,
  CompositeQuestionInput,
  CreateQuestionDto,
  CreateQuestionOptionDto,
  PaginatedQuestions,
  QueryQuestionsParams,
  Question,
  QuestionOption,
  SetCorrectAnswerDto,
  UpdateQuestionClassificationDto,
  UpdateQuestionDto,
  UpdateQuestionOptionDto,
} from "@/types/question";

/**
 * Helper to unwrap responses from apiClient.
 * Handles direct DTOs, direct arrays, paginated responses ({ data, total, page, ... }),
 * and envelope structures ({ success: true, data: ... }).
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
      // If it's a paginated object, keep the outer pagination envelope
      if (!("total" in res && "page" in res)) {
        return (res as { data: T }).data;
      }
    }
  }
  return res as T;
}

export const questionsService = {
  async getQuestions(params?: QueryQuestionsParams): Promise<PaginatedQuestions> {
    const response = await apiClient.get<PaginatedQuestions>("/questions", {
      params,
    });
    return unwrapResponse<PaginatedQuestions>(response);
  },

  async getQuestion(id: string): Promise<Question> {
    const response = await apiClient.get<Question>(`/questions/${id}`);
    return unwrapResponse<Question>(response);
  },

  async createQuestion(dto: CreateQuestionDto): Promise<Question> {
    const response = await apiClient.post<Question>("/questions", dto);
    return unwrapResponse<Question>(response);
  },

  async updateQuestion(id: string, dto: UpdateQuestionDto): Promise<Question> {
    const response = await apiClient.patch<Question>(`/questions/${id}`, dto);
    return unwrapResponse<Question>(response);
  },

  async deleteQuestion(id: string): Promise<void> {
    await apiClient.delete(`/questions/${id}`);
  },

  async updateClassification(
    id: string,
    dto: UpdateQuestionClassificationDto
  ): Promise<Question> {
    const response = await apiClient.put<Question>(
      `/questions/${id}/classification`,
      dto
    );
    return unwrapResponse<Question>(response);
  },

  async assignGroup(
    id: string,
    dto: AssignQuestionGroupDto
  ): Promise<Question> {
    const response = await apiClient.patch<Question>(
      `/questions/${id}/group`,
      dto
    );
    return unwrapResponse<Question>(response);
  },

  async detachGroup(id: string): Promise<Question> {
    const response = await apiClient.delete<Question>(`/questions/${id}/group`);
    return unwrapResponse<Question>(response);
  },

  async createOption(
    id: string,
    dto: CreateQuestionOptionDto
  ): Promise<QuestionOption> {
    const response = await apiClient.post<QuestionOption>(
      `/questions/${id}/options`,
      dto
    );
    return unwrapResponse<QuestionOption>(response);
  },

  async updateOption(
    id: string,
    optionId: string,
    dto: UpdateQuestionOptionDto
  ): Promise<QuestionOption> {
    const response = await apiClient.patch<QuestionOption>(
      `/questions/${id}/options/${optionId}`,
      dto
    );
    return unwrapResponse<QuestionOption>(response);
  },

  async deleteOption(id: string, optionId: string): Promise<void> {
    await apiClient.delete(`/questions/${id}/options/${optionId}`);
  },

  async setCorrectAnswer(
    id: string,
    dto: SetCorrectAnswerDto
  ): Promise<QuestionOption> {
    const response = await apiClient.patch<QuestionOption>(
      `/questions/${id}/correct-answer`,
      dto
    );
    return unwrapResponse<QuestionOption>(response);
  },

  /**
   * Orchestrates complete composite question creation flow (PM Point 1):
   * 1. POST /questions -> questionId
   * 2. Parallel: PUT /questions/:id/classification and 4x POST /questions/:id/options
   * 3. PATCH /questions/:id/correct-answer with the optionId marked isCorrect
   * 4. GET /questions/:id to return full composite question
   */
  async createCompositeQuestion(input: CompositeQuestionInput): Promise<Question> {
    // Step 1: Create base question
    const question = await this.createQuestion({
      content: input.content,
      questionType: input.questionType || "single_choice",
      explanation: input.explanation,
    });

    const questionId = question.id;

    // Step 2: Concurrently apply classification and create options
    const classificationPromise = this.updateClassification(questionId, {
      partId: input.partId,
      difficulty: input.difficulty,
      topicIds: input.topicIds || [],
      skillIds: input.skillIds || [],
    });

    const optionPromises = input.options.map((opt) =>
      this.createOption(questionId, {
        content: opt.content,
        position: opt.position,
        isCorrect: opt.isCorrect,
      })
    );

    const [, ...createdOptions] = await Promise.all([
      classificationPromise,
      ...optionPromises,
    ]);

    // Step 3: Identify the option with isCorrect = true and set it
    const correctInputOption = input.options.find((o) => o.isCorrect);
    if (correctInputOption) {
      const correctCreatedOption = createdOptions.find(
        (o) => o.position === correctInputOption.position
      );
      if (correctCreatedOption) {
        await this.setCorrectAnswer(questionId, {
          optionId: correctCreatedOption.id,
        });
      }
    }

    // Step 4: Return full question
    return this.getQuestion(questionId);
  },
};
