import apiClient from "./api-client";
import {
  ImportErrorDetail,
  ImportJobDetail,
  ImportTargetStatus,
  ImportUploadResponse,
  PaginatedImportJobs,
  QueryImportJobsParams,
  SubmitForReviewDto,
  SubmitForReviewResponse,
} from "@/types/question-import";

/**
 * Helper to unwrap responses from apiClient.
 * Preserves paginated objects ({ items, total, page, ... }) and unwraps { data: ... } envelopes.
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
      if (!("total" in res && "page" in res)) {
        return (res as { data: T }).data;
      }
    }
  }
  return res as T;
}

function escapeCsvCell(value: string | number | undefined | null): string {
  const str = value === undefined || value === null ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export const questionsImportService = {
  /**
   * GET /api/v1/questions/import/template
   * Downloads the standard 15-column TOEIC Excel template.
   */
  async downloadTemplate(): Promise<{ blob: Blob; fileName: string }> {
    const response = await apiClient.raw.get<Blob>("/questions/import/template", {
      responseType: "blob",
    });

    const disposition =
      (response.headers?.["content-disposition"] as string | undefined) || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const fileName = match?.[1] || "toeic_questions_template.xlsx";

    return {
      blob: response.data,
      fileName,
    };
  },

  /**
   * POST /api/v1/questions/import?targetStatus=draft|pending_review
   * Uploads an Excel (.xlsx/.xls) or .zip package for bulk question import.
   */
  async importQuestions(
    file: File,
    targetStatus: ImportTargetStatus = "draft"
  ): Promise<ImportUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ImportUploadResponse>(
      "/questions/import",
      formData,
      {
        params: { targetStatus },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return unwrapResponse<ImportUploadResponse>(response);
  },

  /**
   * GET /api/v1/questions/import/jobs/:id
   * Fetches detail and real-time progress of a specific import job.
   */
  async getImportJobById(id: string): Promise<ImportJobDetail> {
    const response = await apiClient.get<ImportJobDetail>(
      `/questions/import/jobs/${id}`
    );
    return unwrapResponse<ImportJobDetail>(response);
  },

  /**
   * GET /api/v1/questions/import/jobs
   * Lists paginated import job history for current teacher or admin.
   */
  async getImportJobs(
    params?: QueryImportJobsParams
  ): Promise<PaginatedImportJobs> {
    const response = await apiClient.get<PaginatedImportJobs>(
      "/questions/import/jobs",
      {
        params,
      }
    );
    return unwrapResponse<PaginatedImportJobs>(response);
  },

  /**
   * POST /api/v1/questions/import/submit-for-review
   * Submits selected draft/revision_requested questions (with Group Atomicity) for review.
   */
  async submitForReview(
    dto: SubmitForReviewDto
  ): Promise<SubmitForReviewResponse> {
    const response = await apiClient.post<SubmitForReviewResponse>(
      "/questions/import/submit-for-review",
      dto
    );
    return unwrapResponse<SubmitForReviewResponse>(response);
  },

  /**
   * Formats error details into a UTF-8 BOM CSV string with strict quote escaping (PMR 004 #4).
   */
  exportErrorLogCsv(fileName: string, errors: ImportErrorDetail[]): string {
    const header = ["Row", "Code", "Error", "Source_File"]
      .map(escapeCsvCell)
      .join(",");
    const lines = errors.map((item) =>
      [
        escapeCsvCell(item.row),
        escapeCsvCell(item.code || "ROW_VALIDATION_ERROR"),
        escapeCsvCell(item.error),
        escapeCsvCell(fileName),
      ].join(",")
    );
    return `\uFEFF${[header, ...lines].join("\n")}`;
  },
};
