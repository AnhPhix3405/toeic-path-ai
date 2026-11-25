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
  attemptCode?: string;
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
  attemptCode?: string;
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
  attemptCode?: string;
  examTitle: string;
  startedAt: string;
  remainingSeconds: number;
}

// =========================================================================
// SPRINT 7: SUBMISSION, SCORE REPORT, REVIEW & HISTORY DTOs
// =========================================================================

export type ScoreConversionType = "DEFAULT_ETS" | "RAW_PERCENTAGE" | "CUSTOM";

export type AttemptReviewFilter =
  | "all"
  | "correct"
  | "wrong"
  | "skipped"
  | "marked";

export interface SubmitExamAttemptResponse {
  attemptId: string;
  status: ExamAttemptStatus;
  submittedAt: string;
  durationSpentSeconds: number;
  totalScore: number | null;
  listeningScore: number | null;
  readingScore: number | null;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalQuestions: number;
  accuracyPercentage: number;
  isPassed: boolean | null;
}

export interface PartBreakdownItem {
  partNumber: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  avgTimeSeconds: number;
}

export interface SkillBreakdownItem {
  skillId: string;
  skillCode: string;
  skillName: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
}

export interface ExamAttemptResult {
  attemptId: string;
  examId: string;
  examTitle: string;
  mode: PartPracticeMode;
  selectedParts: number[] | null;
  scoreConversionType: ScoreConversionType;
  status: ExamAttemptStatus;
  startedAt: string;
  submittedAt: string;
  gradedAt: string;
  durationSpentSeconds: number;
  totalScore: number | null;
  listeningScore: number | null;
  readingScore: number | null;
  passingScore: number | null;
  isPassed: boolean | null;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  accuracyPercentage: number;
  partBreakdown: PartBreakdownItem[];
  skillBreakdown: SkillBreakdownItem[];
}

export interface QueryAttemptReviewParams {
  partNumber?: number;
  filter?: AttemptReviewFilter;
}

export interface ReviewFilterCounts {
  all: number;
  correct: number;
  wrong: number;
  skipped: number;
  marked: number;
}

export interface QuestionOptionReview {
  id: string;
  label: string;
  content?: string | null;
  isCorrect: boolean;
}

export interface QuestionGroupReview {
  id: string;
  title?: string | null;
  passageText?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  transcript?: string | null;
}

export interface QuestionReviewItem {
  id: string;
  partNumber: number;
  orderIndex: number;
  originalQuestionNumber?: number | null;
  questionGroupId?: string | null;
  content?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  transcript?: string | null;
  options: QuestionOptionReview[];
  selectedOptionId: string | null;
  correctOptionId: string | null;
  isCorrect: boolean;
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
  explanation?: string | null;
}

export interface ExamAttemptReviewResponse {
  attemptId: string;
  filterCounts: ReviewFilterCounts;
  questionGroups: QuestionGroupReview[];
  questions: QuestionReviewItem[];
}

export interface QueryAttemptHistoryParams {
  page?: number;
  limit?: number;
  examId?: string;
  mode?: PartPracticeMode;
  status?: ExamAttemptStatus;
  fromDate?: string;
  toDate?: string;
}

export interface ExamAttemptHistoryItem {
  attemptId: string;
  attemptCode?: string;
  examId: string;
  examTitle: string;
  mode: PartPracticeMode;
  selectedParts: number[] | null;
  status: ExamAttemptStatus;
  totalScore: number | null;
  listeningScore: number | null;
  readingScore: number | null;
  correctCount: number | null;
  totalQuestions: number;
  accuracyPercentage: number | null;
  durationSpentSeconds: number | null;
  isPassed: boolean | null;
  startedAt: string;
  submittedAt: string | null;
}

export interface PaginatedExamAttemptHistory {
  items: ExamAttemptHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
