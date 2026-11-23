export type ImportJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "partially_completed";

export type ImportTargetStatus = "draft" | "pending_review";

export const IMPORT_TEMPLATE_COLUMNS = [
  "Part",
  "Question_Text",
  "Option_A",
  "Option_B",
  "Option_C",
  "Option_D",
  "Correct_Answer",
  "Explanation",
  "Difficulty",
  "Topic_Code",
  "Skill_Code",
  "Group_ID",
  "Passage_Code",
  "Passage_Text",
  "Media_Ref",
] as const;

export interface ImportErrorDetail {
  row: number;
  error: string;
  code?: string;
}

export interface ImportSyncResponse {
  jobId: string;
  isAsync: false;
  status: ImportJobStatus;
  totalRows: number;
  successCount: number;
  errorCount: number;
  createdGroupsCount: number;
  errorDetails?: ImportErrorDetail[] | null;
}

export interface ImportAsyncAcceptedResponse {
  jobId: string;
  isAsync: true;
  status: ImportJobStatus;
  totalRows: number;
  message: string;
}

export type ImportUploadResponse =
  | ImportSyncResponse
  | ImportAsyncAcceptedResponse;

export interface ImportJobDetail {
  id: string;
  fileName: string;
  fileUrl: string | null;
  fileType: "excel" | "zip" | string;
  status: ImportJobStatus;
  targetStatus: ImportTargetStatus;
  totalRows: number;
  successCount: number;
  errorCount: number;
  createdGroupsCount: number;
  errorDetails: ImportErrorDetail[] | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface QueryImportJobsParams {
  page?: number;
  limit?: number;
  status?: ImportJobStatus;
  from?: string;
  to?: string;
}

export interface PaginatedImportJobs {
  items: ImportJobDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SubmitForReviewDto {
  questionIds: string[];
}

export interface SkippedReviewItem {
  id: string;
  reason: string;
}

export interface SubmitForReviewResponse {
  submittedCount: number;
  submittedIds: string[];
  skipped: SkippedReviewItem[];
}
