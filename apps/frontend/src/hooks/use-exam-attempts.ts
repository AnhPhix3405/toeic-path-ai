import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { examAttemptsService } from "@/services/exam-attempts.service";
import {
  BatchSaveAnswersDto,
  CreateExamAttemptDto,
  QueryAttemptHistoryParams,
  QueryAttemptQuestionsParams,
  QueryAttemptReviewParams,
  SaveAnswerDto,
} from "@/types/exam-attempt";

export const examAttemptKeys = {
  all: ["exam-attempts"] as const,
  overview: (attemptId: string) =>
    [...examAttemptKeys.all, "overview", attemptId] as const,
  questions: (attemptId: string, params?: QueryAttemptQuestionsParams) =>
    [...examAttemptKeys.all, "questions", attemptId, params ?? {}] as const,
  result: (attemptId: string) =>
    [...examAttemptKeys.all, "result", attemptId] as const,
  review: (attemptId: string, params?: QueryAttemptReviewParams) =>
    [...examAttemptKeys.all, "review", attemptId, params ?? {}] as const,
  history: (params?: QueryAttemptHistoryParams) =>
    [...examAttemptKeys.all, "history", params ?? {}] as const,
};

export function useAttemptOverview(attemptId: string | null) {
  return useQuery({
    queryKey: examAttemptKeys.overview(attemptId ?? ""),
    queryFn: () => examAttemptsService.getAttemptOverview(attemptId!),
    enabled: Boolean(attemptId),
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 403 || status === 404 || status === 400) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useAttemptQuestions(
  attemptId: string | null,
  options?: { enabled?: boolean; params?: QueryAttemptQuestionsParams }
) {
  const isEnabled =
    Boolean(attemptId) && (options?.enabled ?? true);

  return useQuery({
    queryKey: examAttemptKeys.questions(attemptId ?? "", options?.params),
    queryFn: () =>
      examAttemptsService.getAttemptQuestions(attemptId!, options?.params),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 30, // Snapshot is immutable during the attempt
    refetchOnWindowFocus: false,
  });
}

export function useStartExamAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateExamAttemptDto) =>
      examAttemptsService.startAttempt(dto),
    onSuccess: (summary) => {
      queryClient.invalidateQueries({
        queryKey: ["exam-overview", summary.examId],
      });
      queryClient.invalidateQueries({
        queryKey: ["public-exams"],
      });
    },
  });
}

export function useAbandonExamAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attemptId: string) =>
      examAttemptsService.abandonAttempt(attemptId),
    onSuccess: (_res, attemptId) => {
      queryClient.invalidateQueries({
        queryKey: examAttemptKeys.overview(attemptId),
      });
      queryClient.invalidateQueries({
        queryKey: ["exam-overview"],
      });
      queryClient.invalidateQueries({
        queryKey: ["public-exams"],
      });
    },
  });
}

export function useSaveAnswer(attemptId: string) {
  return useMutation({
    mutationFn: (dto: SaveAnswerDto) =>
      examAttemptsService.saveAnswer(attemptId, dto),
  });
}

export function useBatchSaveAnswers(attemptId: string) {
  return useMutation({
    mutationFn: (dto: BatchSaveAnswersDto) =>
      examAttemptsService.batchSaveAnswers(attemptId, dto),
  });
}

export function useSubmitExamAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attemptId: string) =>
      examAttemptsService.submitAttempt(attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examAttemptKeys.all });
      queryClient.invalidateQueries({ queryKey: ["exam-overview"] });
      queryClient.invalidateQueries({ queryKey: ["public-exams"] });
    },
  });
}

export function useAttemptResult(attemptId: string | null) {
  return useQuery({
    queryKey: examAttemptKeys.result(attemptId ?? ""),
    queryFn: () => examAttemptsService.getAttemptResult(attemptId!),
    enabled: Boolean(attemptId),
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number }; statusCode?: number })
        ?.response?.status ?? (error as { statusCode?: number })?.statusCode;
      if (status === 400 || status === 403 || status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useAttemptReview(
  attemptId: string | null,
  params?: QueryAttemptReviewParams
) {
  return useQuery({
    queryKey: examAttemptKeys.review(attemptId ?? "", params),
    queryFn: () => examAttemptsService.getAttemptReview(attemptId!, params),
    enabled: Boolean(attemptId),
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number }; statusCode?: number })
        ?.response?.status ?? (error as { statusCode?: number })?.statusCode;
      if (status === 400 || status === 403 || status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useAttemptHistory(params?: QueryAttemptHistoryParams) {
  return useQuery({
    queryKey: examAttemptKeys.history(params),
    queryFn: () => examAttemptsService.getAttemptHistory(params),
    placeholderData: (prev) => prev,
  });
}
