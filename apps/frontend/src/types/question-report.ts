import { QuestionStatus, QuestionType } from "./question";

export type QuestionReportReason =
  | "wrong_answer"
  | "typo_error"
  | "broken_media"
  | "unclear_explanation"
  | "other";

export type QuestionReportStatus =
  | "pending"
  | "in_review"
  | "resolved"
  | "rejected";

export type ResolvableReportStatus = "in_review" | "resolved" | "rejected";

export interface CreateQuestionReportDto {
  reason: QuestionReportReason;
  description?: string;
  attemptId?: string;
}

export interface ResolveQuestionReportDto {
  status: ResolvableReportStatus;
  resolutionNote?: string;
  resolveAllForQuestion?: boolean;
}

export interface QueryMyQuestionReportsParams {
  page?: number;
  limit?: number;
  status?: QuestionReportStatus;
}

export interface QueryQuestionReportsParams extends QueryMyQuestionReportsParams {
  reason?: QuestionReportReason;
  questionId?: string;
}

export interface MyQuestionReportItem {
  id: string;
  reportCode?: string;
  questionId: string;
  questionCode?: string;
  attemptId: string | null;
  reason: QuestionReportReason;
  description: string | null;
  status: QuestionReportStatus;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface PaginatedMyQuestionReports {
  items: MyQuestionReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminQuestionReportItem extends MyQuestionReportItem {
  reporterId: string;
  reporterEmail: string | null;
  partNumber: number | null;
  questionContent: string | null;
  resolvedById: string | null;
  updatedAt: string;
}

export interface PaginatedAdminQuestionReports {
  items: AdminQuestionReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuestionReportOptionContext {
  id: string;
  label: string;
  content: string | null;
  isCorrect: boolean;
  position: number;
}

export interface QuestionReportGroupContext {
  id: string;
  title: string | null;
  passageText: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  transcript: string | null;
}

export interface QuestionReportQuestionContext {
  id: string;
  questionCode?: string;
  partNumber: number | null;
  questionType: QuestionType;
  status: QuestionStatus;
  content: string | null;
  explanation: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  options: QuestionReportOptionContext[];
  questionGroup: QuestionReportGroupContext | null;
}

export interface QuestionReportDetail {
  id: string;
  reportCode?: string;
  questionId: string;
  questionCode?: string;
  reporterId: string;
  reporterEmail: string | null;
  attemptId: string | null;
  reason: QuestionReportReason;
  description: string | null;
  status: QuestionReportStatus;
  resolvedById: string | null;
  resolvedByEmail: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  question: QuestionReportQuestionContext;
}

export interface ResolveQuestionReportResponse {
  id: string;
  questionId: string;
  status: QuestionReportStatus;
  resolvedById: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  bulkResolvedCount: number;
}
