export type ExamAttemptStatus =
  | "in_progress"
  | "submitted"
  | "abandoned"
  | "timed_out";

export type PartPracticeMode = "full_exam" | "part_practice";

export type ExamSyncStatus = "synced" | "syncing" | "offline" | "error";

export type ReadingFontScale = "sm" | "base" | "lg";

// =========================================================================
// REQUEST DTOs (100% aligned with Backend ExamAttemptsController)
// =========================================================================

export interface CreateExamAttemptDto {
  examId: string;
  mode?: PartPracticeMode;
  selectedParts?: number[];
  deviceInfo?: string;
}

export interface QueryAttemptQuestionsParams {
  partNumber?: number;
}

export interface SaveAnswerDto {
  questionId: string;
  /**
   * 3 strict semantics (PMR 019):
   * - UUID string: select option
   * - null: clear selection (uncheck)
   * - undefined (omitted): toggle review flag only without overwriting option
   */
  selectedOptionId?: string | null;
  isMarkedForReview?: boolean;
  /** Incremental delta seconds (0..7200) since last successful sync */
  timeSpentSeconds?: number;
}

export interface BatchAnswerItemDto {
  questionId: string;
  selectedOptionId?: string | null;
  isMarkedForReview?: boolean;
  timeSpentSeconds?: number;
  clientAnsweredAt?: string;
}

export interface BatchSaveAnswersDto {
  answers: BatchAnswerItemDto[];
}

// =========================================================================
// RESPONSE DTOs (100% aligned with Backend ExamAttemptsController)
// =========================================================================

export interface ExamAttemptSummary {
  attemptId: string;
  examId: string;
  examTitle: string;
  status: ExamAttemptStatus;
  mode: PartPracticeMode;
  selectedParts?: number[] | null;
  totalQuestions: number;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  serverTimeNow: string;
  isResumed?: boolean;
}

export interface AbandonAttemptResponse {
  success: boolean;
  message: string;
  abandonedAt: string;
}

export interface AttemptQuestionStatus {
  questionId: string;
  partNumber: number;
  orderIndex: number;
  isAnswered: boolean;
  isMarkedForReview: boolean;
}

export interface ExamAttemptOverview {
  id: string;
  examId: string;
  examTitle: string;
  status: ExamAttemptStatus;
  mode: PartPracticeMode;
  selectedParts?: number[] | null;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  serverTimeNow: string;
  isExpired: boolean;
  totalQuestions: number;
  answeredCount: number;
  markedForReviewCount: number;
  questionsProgress: AttemptQuestionStatus[];
}

export interface QuestionOptionItem {
  id: string;
  label: string;
  /** Nullable for Part 1 & Part 2 blind options (Rule #1002) */
  content?: string | null;
}

export interface QuestionGroupDelivery {
  id: string;
  passageText?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
}

export interface QuestionDeliveryItem {
  id: string;
  partNumber: number;
  orderIndex: number;
  originalQuestionNumber?: number;
  questionGroupId?: string | null;
  /** Nullable for Part 1, Part 2, and Part 6 sub-questions (Rule #1002) */
  content?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  options: QuestionOptionItem[];
  selectedOptionId?: string | null;
  isMarkedForReview?: boolean;
}

export interface ExamAttemptQuestionsResponse {
  attemptId: string;
  partNumber?: number | null;
  totalQuestionsInPart: number;
  questionGroups: QuestionGroupDelivery[];
  questions: QuestionDeliveryItem[];
}

export interface SaveAnswerResponse {
  success: boolean;
  questionId: string;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
  answeredCount: number;
  remainingSeconds: number;
  savedAt: string;
}

export interface FailedBatchItem {
  questionId: string;
  reason: string;
}

export interface BatchSaveAnswersResponse {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  failedItems: FailedBatchItem[];
  answeredCount: number;
  remainingSeconds: number;
  serverTimeNow: string;
}

// =========================================================================
// CONFLICT & ERROR SHAPES
// =========================================================================

export interface AnotherExamInProgressErrorData {
  errorCode: "ERR_ANOTHER_EXAM_IN_PROGRESS";
  message: string;
  attemptId: string;
  examTitle: string;
  startedAt: string;
  remainingSeconds: number;
}
