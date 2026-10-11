import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { questionsService } from "@/services/questions.service";
import {
  AssignQuestionGroupDto,
  CompositeQuestionInput,
  CreateQuestionDto,
  CreateQuestionOptionDto,
  QueryQuestionsParams,
  SetCorrectAnswerDto,
  UpdateQuestionClassificationDto,
  UpdateQuestionDto,
  UpdateQuestionOptionDto,
} from "@/types/question";

export function useQuestions(params?: QueryQuestionsParams) {
  return useQuery({
    queryKey: ["questions", params],
    queryFn: () => questionsService.getQuestions(params),
    placeholderData: (prev) => prev,
  });
}

export function useQuestion(id: string | null) {
  return useQuery({
    queryKey: ["question", id],
    queryFn: () => (id ? questionsService.getQuestion(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateQuestionDto) => questionsService.createQuestion(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Tạo câu hỏi thành công");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo câu hỏi";
      toast.error(msg);
    },
  });
}

export function useCreateCompositeQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CompositeQuestionInput) =>
      questionsService.createCompositeQuestion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Tạo và hoàn thiện câu hỏi thành công");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Lỗi khi lưu câu hỏi";
      toast.error(msg);
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateQuestionDto }) =>
      questionsService.updateQuestion(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["question", variables.id] });
      toast.success("Cập nhật câu hỏi thành công");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật câu hỏi";
      toast.error(msg);
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => questionsService.deleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Đã xóa câu hỏi");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể xóa câu hỏi";
      toast.error(msg);
    },
  });
}

export function useUpdateQuestionClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateQuestionClassificationDto;
    }) => questionsService.updateClassification(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["question", variables.id] });
      toast.success("Cập nhật phân loại thành công");
    },
  });
}

export function useAssignQuestionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: AssignQuestionGroupDto;
    }) => questionsService.assignGroup(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["question-groups"] });
      toast.success("Đã gán câu hỏi vào nhóm");
    },
  });
}

export function useDetachQuestionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => questionsService.detachGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["question-groups"] });
      toast.success("Đã gỡ câu hỏi khỏi nhóm");
    },
  });
}

export function useCreateQuestionOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      dto,
    }: {
      questionId: string;
      dto: CreateQuestionOptionDto;
    }) => questionsService.createOption(questionId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["question", variables.questionId] });
      toast.success("Đã thêm lựa chọn đáp án");
    },
  });
}

export function useUpdateQuestionOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      optionId,
      dto,
    }: {
      questionId: string;
      optionId: string;
      dto: UpdateQuestionOptionDto;
    }) => questionsService.updateOption(questionId, optionId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["question", variables.questionId] });
    },
  });
}

export function useDeleteQuestionOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      optionId,
    }: {
      questionId: string;
      optionId: string;
    }) => questionsService.deleteOption(questionId, optionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["question", variables.questionId] });
      toast.success("Đã xóa lựa chọn đáp án");
    },
  });
}

export function useSetCorrectAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      dto,
    }: {
      questionId: string;
      dto: SetCorrectAnswerDto;
    }) => questionsService.setCorrectAnswer(questionId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["question", variables.questionId] });
      toast.success("Đã cập nhật đáp án đúng");
    },
  });
}
