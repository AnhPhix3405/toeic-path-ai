export type ExamType = "full_test" | "mini_test" | "placement_test";

export type ExamStatus = "draft" | "published" | "closed" | "archived";

export type ScoreConversionType = "DEFAULT_ETS" | "CUSTOM" | "RAW_PERCENTAGE";

export interface ExamSectionItem {
  id: string;
  examId: string;
  partId: string;
  partNumber?: number;
  partName?: string;
  targetQuestionsCount: number;
  targetDurationMinutes: number | null;
  actualQuestionsCount?: number;
}

export interface ExamDetail {
  id: string;
  title: string;
  slug?: string;
  description: string | null;
  type: ExamType;
  durationMinutes: number;
  maxAttempts: number | null;
  passingScore: number | null;
  openAt: string | null;
  closeAt: string | null;
  allowPartPractice: boolean;
  isShuffledQuestions: boolean;
  isShuffledOptions: boolean;
  scoreConversionType: ScoreConversionType;
  status: ExamStatus;
  publishedAt: string | null;
  version: number;
  createdBy: string;
  isDeleted: boolean;
  sectionsCount: number;
  sections?: ExamSectionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestionItem {
  id: string;
  examId: string;
  examSectionId: string;
  questionId: string;
  orderIndex: number;
  questionGroupId: string | null;
  groupOrder: number | null;
  partNumber?: number;
  difficulty?: string;
  content?: string | null;
}

export interface ExamStructure {
  id: string;
  title: string;
  slug?: string;
  type: ExamType;
  status: ExamStatus;
  version: number;
  totalQuestions: number;
  sections: ExamSectionItem[];
  questions: ExamQuestionItem[];
}

export interface ExamPublishResult {
  id: string;
  title: string;
  status: ExamStatus;
  version: number;
  isScheduled: boolean;
  openAt: string | null;
  closeAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface ExamCatalogItem {
  id: string;
  title: string;
  slug?: string;
  description: string | null;
  type: ExamType;
  durationMinutes: number;
  totalQuestions: number;
  allowPartPractice: boolean;
  totalAttempts: number;
  openAt: string | null;
  closeAt: string | null;
  isScheduled: boolean;
}

export interface ExamPartOverview {
  partNumber: number;
  partName: string;
  questionCount: number;
  suggestedDuration: number | null;
}

export interface ExamOverview {
  id: string;
  title: string;
  slug?: string;
  description: string | null;
  type: ExamType;
  durationMinutes: number;
  totalQuestions: number;
  allowPartPractice: boolean;
  parts: ExamPartOverview[];
  openAt: string | null;
  closeAt: string | null;
  isScheduled: boolean;
  remainingAttempts: number | null;
}

export interface PaginatedManageExams {
  items: ExamDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedPublicExams {
  items: ExamCatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateExamDto {
  title: string;
  description?: string;
  type: ExamType;
  durationMinutes: number;
  maxAttempts?: number;
  passingScore?: number;
  openAt?: string;
  closeAt?: string;
  allowPartPractice?: boolean;
  isShuffledQuestions?: boolean;
  isShuffledOptions?: boolean;
  scoreConversionType?: ScoreConversionType;
}

export interface UpdateExamDto extends Partial<CreateExamDto> {
  version: number;
}

export interface QueryExamsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: ExamType;
}

export interface QueryManageExamsParams extends QueryExamsParams {
  status?: ExamStatus;
}

export interface SectionItemInput {
  partNumber: number;
  targetQuestionsCount: number;
  targetDurationMinutes?: number;
}

export interface ConfigureExamSectionsDto {
  version: number;
  sections: SectionItemInput[];
}

export interface AddExamQuestionsDto {
  version: number;
  sectionId: string;
  questionIds?: string[];
  questionGroupIds?: string[];
}

export interface ReorderItemInput {
  questionId: string;
  orderIndex: number;
}

export interface ReorderExamQuestionsDto {
  version: number;
  items: ReorderItemInput[];
}

export interface PartGenerationCriteriaInput {
  partNumber: number;
  targetQuestionsCount?: number;
  easyPercentage?: number;
  mediumPercentage?: number;
  hardPercentage?: number;
  topicIds?: string[];
}

export interface AutoGenerateExamDto {
  version: number;
  criteria?: PartGenerationCriteriaInput[];
}

export interface ChangeExamStatusDto {
  version: number;
}

export interface PublishChecklistErrorInfo {
  message: string;
  errorCode?: string;
  invalidQuestionIds?: string[];
}
