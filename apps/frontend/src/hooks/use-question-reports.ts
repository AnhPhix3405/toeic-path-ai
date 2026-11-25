import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { questionReportsService } from "@/services/question-reports.service";
import {
  CreateQuestionReportDto,
  QueryMyQuestionReportsParams,
  QueryQuestionReportsParams,
  ResolveQuestionReportDto,
} from "@/types/question-report";

export const questionReportKeys = {
  all: ["question-reports"] as const,
  my: (params?: QueryMyQuestionReportsParams) =>
    [...questionReportKeys.all, "my", params ?? {}] as const,
  management: (params?: QueryQuestionReportsParams) =>
    [...questionReportKeys.all, "management", params ?? {}] as const,
  detail: (id: string) => [...questionReportKeys.all, "detail", id] as const,
};

export function useCreateQuestionReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      dto,
    }: {
      questionId: string;
      dto: CreateQuestionReportDto;
    }) => questionReportsService.createReport(questionId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionReportKeys.all });
    },
  });
}

export function useMyQuestionReports(params?: QueryMyQuestionReportsParams) {
  return useQuery({
    queryKey: questionReportKeys.my(params),
    queryFn: () => questionReportsService.getMyReports(params),
    placeholderData: (prev) => prev,
  });
}

export function useQuestionReports(params?: QueryQuestionReportsParams) {
  return useQuery({
    queryKey: questionReportKeys.management(params),
    queryFn: () => questionReportsService.getReportsForManagement(params),
    placeholderData: (prev) => prev,
  });
}

export function useQuestionReportDetail(id: string | null) {
  return useQuery({
    queryKey: questionReportKeys.detail(id ?? ""),
    queryFn: () => questionReportsService.getReportDetail(id!),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
  });
}

export function useResolveQuestionReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: ResolveQuestionReportDto;
    }) => questionReportsService.resolveReport(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionReportKeys.all });
    },
  });
}
