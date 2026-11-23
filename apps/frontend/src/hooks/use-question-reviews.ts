"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { questionReviewsService } from "@/services/question-reviews.service";
import {
  ApproveQuestionDto,
  BatchApproveQuestionsDto,
  QueryReviewQueueParams,
  QuickFixApproveDto,
  RejectQuestionDto,
  RequestRevisionDto,
} from "@/types/question-review";
import { isApiError } from "@/services/api-client";

export function useReviewQueue(params?: QueryReviewQueueParams) {
  return useQuery({
    queryKey: ["question-review-queue", params],
    queryFn: () => questionReviewsService.getReviewQueue(params),
  });
}

export function useApproveQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ApproveQuestionDto }) =>
      questionReviewsService.approveQuestion(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["question-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["question", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["question-review-logs", variables.id],
      });
      toast.success("Đã phê duyệt và xuất bản câu hỏi thành công.");
    },
    onError: (err: unknown) => {
      if (isApiError(err) && err.statusCode === 409) {
        return; // Handled by OptimisticLockConflictModal
      }
      const msg = isApiError(err)
        ? err.message
        : "Không thể phê duyệt câu hỏi. Vui lòng thử lại.";
      toast.error(msg);
    },
  });
}

export function useRequestRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RequestRevisionDto }) =>
      questionReviewsService.requestRevision(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["question-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["question", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["question-review-logs", variables.id],
      });
      toast.success("Đã gửi yêu cầu chỉnh sửa kèm nhận xét cho giáo viên.");
    },
    onError: (err: unknown) => {
      if (isApiError(err) && err.statusCode === 409) {
        return;
      }
      const msg = isApiError(err)
        ? err.message
        : "Không thể gửi yêu cầu chỉnh sửa.";
      toast.error(msg);
    },
  });
}

export function useRejectQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RejectQuestionDto }) =>
      questionReviewsService.rejectQuestion(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["question-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["question", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["question-review-logs", variables.id],
      });
      toast.success("Đã từ chối câu hỏi và ghi nhận lý do vào nhật ký.");
    },
    onError: (err: unknown) => {
      if (isApiError(err) && err.statusCode === 409) {
        return;
      }
      const msg = isApiError(err) ? err.message : "Không thể từ chối câu hỏi.";
      toast.error(msg);
    },
  });
}

export function useQuickFixApprove() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: QuickFixApproveDto }) =>
      questionReviewsService.quickFixApprove(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["question-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["question", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["question-histories", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["question-review-logs", variables.id],
      });
      toast.success(
        "Đã lưu chỉnh sửa nhanh (snapshot history) và xuất bản câu hỏi."
      );
    },
    onError: (err: unknown) => {
      if (isApiError(err) && err.statusCode === 409) {
        return;
      }
      const msg = isApiError(err)
        ? err.message
        : "Không thể sửa nhanh và phê duyệt câu hỏi.";
      toast.error(msg);
    },
  });
}

export function useBatchApproveQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: BatchApproveQuestionsDto) =>
      questionReviewsService.batchApprove(dto),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["question-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      if (res.approvedCount > 0) {
        toast.success(
          `Đã phê duyệt hàng loạt thành công ${res.approvedCount} câu hỏi.`
        );
      }
      if (res.skipped && res.skipped.length > 0) {
        toast.warning(
          `Có ${res.skipped.length} câu hỏi bị bỏ qua khi duyệt hàng loạt.`
        );
      }
    },
    onError: (err: unknown) => {
      const msg = isApiError(err)
        ? err.message
        : "Không thể thực hiện phê duyệt hàng loạt.";
      toast.error(msg);
    },
  });
}

export function useQuestionHistories(questionId?: string | null) {
  return useQuery({
    queryKey: ["question-histories", questionId],
    queryFn: () => questionReviewsService.getQuestionHistories(questionId!),
    enabled: Boolean(questionId),
  });
}

export function useQuestionReviewLogs(questionId?: string | null) {
  return useQuery({
    queryKey: ["question-review-logs", questionId],
    queryFn: () => questionReviewsService.getQuestionReviewLogs(questionId!),
    enabled: Boolean(questionId),
  });
}
