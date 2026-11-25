import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { examsService } from "@/services/exams.service";
import {
  AddExamQuestionsDto,
  AutoGenerateExamDto,
  ChangeExamStatusDto,
  ConfigureExamSectionsDto,
  CreateExamDto,
  QueryExamsParams,
  QueryManageExamsParams,
  ReorderExamQuestionsDto,
  UpdateExamDto,
} from "@/types/exam";

export function useManageExams(params?: QueryManageExamsParams) {
  return useQuery({
    queryKey: ["manage-exams", params],
    queryFn: () => examsService.getManageExams(params),
    placeholderData: (prev) => prev,
  });
}

export function usePublicExams(params?: QueryExamsParams) {
  return useQuery({
    queryKey: ["public-exams", params],
    queryFn: () => examsService.getPublicExams(params),
    placeholderData: (prev) => prev,
  });
}

export function useExamManageDetail(id: string | null) {
  return useQuery({
    queryKey: ["exam-manage-detail", id],
    queryFn: () => (id ? examsService.getManageExamDetail(id) : null),
    enabled: Boolean(id),
  });
}

export function useExamStructure(id: string | null) {
  return useQuery({
    queryKey: ["exam-structure", id],
    queryFn: () => (id ? examsService.getExamStructure(id) : null),
    enabled: Boolean(id),
  });
}

export function useExamOverview(id: string | null) {
  return useQuery({
    queryKey: ["exam-overview", id],
    queryFn: () => (id ? examsService.getExamOverview(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateExamDto) => examsService.createExam(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-exams"] });
      toast.success("Khởi tạo đề thi mới thành công");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Không thể khởi tạo đề thi";
      toast.error(msg);
    },
  });
}

export function useUpdateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateExamDto }) =>
      examsService.updateExam(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-exams"] });
      queryClient.invalidateQueries({ queryKey: ["exam-manage-detail"] });
      queryClient.invalidateQueries({ queryKey: ["exam-structure"] });
      toast.success("Cập nhật cấu hình đề thi thành công");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Không thể cập nhật cấu hình đề thi";
      toast.error(msg);
    },
  });
}

export function useDeleteExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => examsService.deleteExam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-exams"] });
      queryClient.invalidateQueries({ queryKey: ["public-exams"] });
      toast.success("Đã xóa đề thi thành công");
    },
  });
}

export function useConfigureExamSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: ConfigureExamSectionsDto;
    }) => examsService.configureSections(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["exam-structure", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["exam-manage-detail", variables.id],
      });
      toast.success("Đã lưu cấu hình các phần thi (Sections)");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Không thể lưu cấu hình phần thi";
      toast.error(msg);
    },
  });
}

export function useAddExamQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AddExamQuestionsDto }) =>
      examsService.addQuestions(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["exam-structure", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["manage-exams"] });
      toast.success("Đã thêm câu hỏi vào đề thi");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Không thể thêm câu hỏi vào đề thi";
      toast.error(msg);
    },
  });
}

export function useReorderExamQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ReorderExamQuestionsDto }) =>
      examsService.reorderQuestions(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["exam-structure", variables.id],
      });
      toast.success("Đã cập nhật thứ tự câu hỏi");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Không thể sắp xếp lại thứ tự câu hỏi";
      toast.error(msg);
    },
  });
}

export function useRemoveExamQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      questionId,
      version,
    }: {
      id: string;
      questionId: string;
      version: number;
    }) => examsService.removeQuestion(id, questionId, version),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["exam-structure", variables.id],
      });
      toast.success("Đã gỡ câu hỏi khỏi đề thi");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Không thể gỡ câu hỏi khỏi đề thi";
      toast.error(msg);
    },
  });
}

export function useAutoGenerateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AutoGenerateExamDto }) =>
      examsService.autoGenerate(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["exam-structure", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["manage-exams"] });
      toast.success("Đã sinh đề thi tự động thành công");
    },
  });
}

export function usePublishExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ChangeExamStatusDto }) =>
      examsService.publishExam(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["exam-structure", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["exam-manage-detail", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["manage-exams"] });
      queryClient.invalidateQueries({ queryKey: ["public-exams"] });
      toast.success("Xuất bản đề thi thành công");
    },
  });
}

export function useUnpublishExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ChangeExamStatusDto }) =>
      examsService.unpublishExam(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["exam-structure", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["exam-manage-detail", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["manage-exams"] });
      queryClient.invalidateQueries({ queryKey: ["public-exams"] });
      toast.success("Đã rút đề thi về trạng thái Bản nháp (Draft)");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Không thể rút đề thi về bản nháp";
      toast.error(msg);
    },
  });
}

export function useCloseExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ChangeExamStatusDto }) =>
      examsService.closeExam(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["exam-structure", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["exam-manage-detail", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["manage-exams"] });
      queryClient.invalidateQueries({ queryKey: ["public-exams"] });
      toast.success("Đã đóng đề thi");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Không thể đóng đề thi";
      toast.error(msg);
    },
  });
}

export function useArchiveExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ChangeExamStatusDto }) =>
      examsService.archiveExam(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["exam-structure", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["exam-manage-detail", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["manage-exams"] });
      queryClient.invalidateQueries({ queryKey: ["public-exams"] });
      toast.success("Đã chuyển đề thi sang Lưu trữ (Archived)");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Không thể lưu trữ đề thi";
      toast.error(msg);
    },
  });
}
