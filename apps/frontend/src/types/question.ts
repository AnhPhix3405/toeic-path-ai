export type QuestionType = "single_choice";

export type QuestionStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "revision_requested"
  | "rejected";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface ToeicPart {
  id: string;
  partNumber: number;
  name: string;
  description: string | null;
}

export interface TaxonomyItem {
  id: string;
  name: string;
  description: string | null;
}

export interface QuestionOption {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
  position: number;
}

export interface Question {
  id: string;
  content: string;
  questionType: QuestionType;
  status: QuestionStatus;
  groupOrder: number | null;
  explanation: string | null;
  options: QuestionOption[];
  part: ToeicPart | null;
  difficulty: QuestionDifficulty | null;
  topics: TaxonomyItem[];
  skills: TaxonomyItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedQuestions {
  data: Question[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuestionGroup {
  id: string;
  title: string | null;
  context: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
}

export interface QueryQuestionsParams {
  search?: string;
  partId?: string;
  topicIds?: string[];
  skillIds?: string[];
  difficulty?: QuestionDifficulty;
  status?: QuestionStatus;
  questionType?: QuestionType;
  page?: number;
  limit?: number;
}

export interface CreateQuestionDto {
  content: string;
  questionType: QuestionType;
  explanation?: string;
}

export interface UpdateQuestionDto {
  content?: string;
  explanation?: string;
}

export interface UpdateQuestionClassificationDto {
  partId: string;
  topicIds: string[];
  skillIds: string[];
  difficulty: QuestionDifficulty;
}

export interface AssignQuestionGroupDto {
  questionGroupId: string;
  groupOrder: number;
}

export interface CreateQuestionOptionDto {
  content: string;
  isCorrect?: boolean;
  position: number;
}

export interface UpdateQuestionOptionDto {
  content?: string;
  isCorrect?: boolean;
  position?: number;
}

export interface SetCorrectAnswerDto {
  optionId: string;
}

export interface CreateQuestionGroupDto {
  title?: string;
  context: string;
}

export interface UpdateQuestionGroupDto {
  title?: string;
  context?: string;
}

export interface CompositeQuestionInput {
  content: string;
  questionType?: QuestionType;
  explanation?: string;
  partId: string;
  difficulty: QuestionDifficulty;
  topicIds?: string[];
  skillIds?: string[];
  options: {
    content: string;
    isCorrect: boolean;
    position: number;
  }[];
}
