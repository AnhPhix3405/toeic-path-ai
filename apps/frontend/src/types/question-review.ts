import { Question, QuestionStatus } from "./question";

export type QuestionReviewAction =
  | "approved"
  | "revision_requested"
  | "rejected"
  | "quick_fix_approved";

export type QuestionHistoryChangeType =
  | "created"
  | "updated"
  | "resubmitted"
  | "status_changed"
  | "quick_fixed";

export interface QueryReviewQueueParams {
  partId?: string;
  topicIds?: string[];
  creatorId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedReviewQueue {
  items: Question[];
  total: number;
  page: number;
  limit: number;
}

export interface ApproveQuestionDto {
  version: number;
  emergencyBypass?: boolean;
  feedback?: string;
}

export interface RequestRevisionDto {
  version: number;
  feedback: string;
  applyToWholeGroup?: boolean;
}

export interface RejectQuestionDto {
  version: number;
  feedback: string;
  applyToWholeGroup?: boolean;
}

export interface QuickFixOptionDto {
  id: string;
  content?: string | null;
  isCorrect: boolean;
}

export interface QuickFixApproveDto {
  version: number;
  content?: string | null;
  explanation?: string;
  options?: QuickFixOptionDto[];
  emergencyBypass?: boolean;
  feedback?: string;
}

export interface BatchApproveItemDto {
  questionId: string;
  version: number;
}

export interface BatchApproveQuestionsDto {
  items: BatchApproveItemDto[];
}

export interface ReviewActionResponse {
  id: string;
  status: QuestionStatus;
  version: number;
  feedback?: string | null;
  updatedAt: string;
}

export interface SkippedBatchReviewItem {
  questionId: string;
  reason: string;
}

export interface BatchReviewResponse {
  approvedCount: number;
  skipped: SkippedBatchReviewItem[];
}

export interface SnapshotOptionItem {
  id?: string;
  label?: string;
  content: string | null;
  isCorrect: boolean;
  position?: number;
}

export interface QuestionSnapshotData {
  content?: string | null;
  explanation?: string | null;
  options?: SnapshotOptionItem[];
  version?: number;
  status?: QuestionStatus | string;
}

export interface QuestionHistoryItem {
  id: string;
  questionId: string;
  changedBy: string;
  author?: {
    id: string;
    fullName?: string;
    email?: string;
  } | null;
  changeType: QuestionHistoryChangeType;
  snapshotBefore: QuestionSnapshotData | null;
  snapshotAfter: QuestionSnapshotData;
  comment: string | null;
  createdAt: string;
}

export interface QuestionReviewLogItem {
  id: string;
  questionId: string;
  reviewerId: string;
  reviewer?: {
    id: string;
    fullName?: string;
    email?: string;
  } | null;
  action: QuestionReviewAction;
  feedback: string | null;
  version: number;
  createdAt: string;
}
