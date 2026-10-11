import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { questionGroupsService } from "@/services/question-groups.service";
import {
  CreateQuestionGroupDto,
  UpdateQuestionGroupDto,
} from "@/types/question";

export function useQuestionGroups() {
  return useQuery({
    queryKey: ["question-groups"],
    queryFn: () => questionGroupsService.getQuestionGroups(),
  });
}

export function useQuestionGroup(id: string | null) {
  return useQuery({
    queryKey: ["question-groups", id],
    queryFn: () => (id ? questionGroupsService.getQuestionGroup(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateQuestionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateQuestionGroupDto) =>
      questionGroupsService.createQuestionGroup(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-groups"] });
      toast.success("Tạo nhóm câu hỏi thành công");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo nhóm câu hỏi";
      toast.error(msg);
    },
  });
}

export function useUpdateQuestionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateQuestionGroupDto;
    }) => questionGroupsService.updateQuestionGroup(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["question-groups"] });
      queryClient.invalidateQueries({ queryKey: ["question-groups", variables.id] });
      toast.success("Cập nhật nhóm câu hỏi thành công");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật nhóm câu hỏi";
      toast.error(msg);
    },
  });
}

export function useDeleteQuestionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => questionGroupsService.deleteQuestionGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-groups"] });
      toast.success("Đã xóa nhóm câu hỏi");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể xóa nhóm câu hỏi";
      toast.error(msg);
    },
  });
}
