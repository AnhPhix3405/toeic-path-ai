"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { questionsImportService } from "@/services/questions-import.service";
import {
  ImportJobDetail,
  ImportTargetStatus,
  QueryImportJobsParams,
  SubmitForReviewDto,
} from "@/types/question-import";
import { isApiError } from "@/services/api-client";

const TERMINAL_JOB_STATUSES = new Set([
  "completed",
  "partially_completed",
  "failed",
]);

export function useDownloadQuestionsTemplate() {
  return useMutation({
    mutationFn: () => questionsImportService.downloadTemplate(),
    onSuccess: ({ blob, fileName }) => {
      if (typeof window !== "undefined") {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
      }
      toast.success("Đã tải xuống tệp Template Excel mẫu thành công.");
    },
    onError: (err: unknown) => {
      const msg = isApiError(err)
        ? err.message
        : "Không thể tải tệp Template mẫu. Vui lòng thử lại.";
      toast.error(msg);
    },
  });
}

export function useImportQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      targetStatus,
    }: {
      file: File;
      targetStatus: ImportTargetStatus;
    }) => questionsImportService.importQuestions(file, targetStatus),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["questions-import-jobs"] });
      if (!result.isAsync) {
        queryClient.invalidateQueries({ queryKey: ["questions"] });
        queryClient.invalidateQueries({ queryKey: ["question-groups"] });
      }
    },
    onError: (err: unknown) => {
      const msg = isApiError(err)
        ? err.message
        : "Đã xảy ra lỗi trong quá trình tải tệp import.";
      toast.error(msg);
    },
  });
}

/**
 * Polls GET /questions/import/jobs/:id every 2s while job is pending/processing.
 * Automatically stops polling and invalidates cache once when job reaches a terminal status (PMR 004 #3).
 */
export function useImportJobPolling(jobId: string | null, enabled = true) {
  const queryClient = useQueryClient();
  const invalidatedJobRef = useRef<string | null>(null);

  const query = useQuery<ImportJobDetail>({
    queryKey: ["questions-import-job", jobId],
    queryFn: () => questionsImportService.getImportJobById(jobId!),
    enabled: Boolean(jobId) && enabled,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (!status || status === "pending" || status === "processing") {
        return 2000;
      }
      return false;
    },
  });

  useEffect(() => {
    const status = query.data?.status;
    if (
      jobId &&
      status &&
      TERMINAL_JOB_STATUSES.has(status) &&
      invalidatedJobRef.current !== jobId
    ) {
      invalidatedJobRef.current = jobId;
      queryClient.invalidateQueries({ queryKey: ["questions-import-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["question-groups"] });
    }
  }, [jobId, query.data?.status, queryClient]);

  return query;
}

export function useImportJobs(params?: QueryImportJobsParams) {
  return useQuery({
    queryKey: ["questions-import-jobs", params],
    queryFn: () => questionsImportService.getImportJobs(params),
  });
}

export function useSubmitQuestionsForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SubmitForReviewDto) =>
      questionsImportService.submitForReview(dto),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["question-groups"] });
      if (res.submittedCount > 0) {
        toast.success(
          `Đã gửi duyệt thành công ${res.submittedCount} câu hỏi.`
        );
      }
      if (res.skipped && res.skipped.length > 0) {
        toast.warning(
          `Có ${res.skipped.length} câu hỏi bị bỏ qua khi gửi duyệt. Vui lòng kiểm tra chi tiết.`
        );
      }
    },
    onError: (err: unknown) => {
      const msg = isApiError(err)
        ? err.message
        : "Không thể gửi duyệt các câu hỏi đã chọn.";
      toast.error(msg);
    },
  });
}
