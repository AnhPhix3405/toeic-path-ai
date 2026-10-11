import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaService } from '@/services/media.service';
import type {
  MediaResource,
  UpdateMediaTargetDto,
  BatchPresignedUrlDto,
  BatchPresignedUrlResult,
} from '@/types/media';

export const mediaKeys = {
  all: ['media'] as const,
  question: (questionId?: string | null) => ['media', 'question', questionId] as const,
  group: (groupId?: string | null) => ['media', 'group', groupId] as const,
  detail: (id?: string) => ['media', 'detail', id] as const,
};

/**
 * Hook lấy danh sách tài nguyên media của 1 câu hỏi
 */
export function useQuestionMedia(questionId?: string | null) {
  return useQuery({
    queryKey: mediaKeys.question(questionId),
    queryFn: () => mediaService.getMediaByQuestionId(questionId!),
    enabled: Boolean(questionId),
    staleTime: 1000 * 60 * 5, // 5 phút
  });
}

/**
 * Hook lấy danh sách tài nguyên media của 1 nhóm câu hỏi
 */
export function useQuestionGroupMedia(groupId?: string | null) {
  return useQuery({
    queryKey: mediaKeys.group(groupId),
    queryFn: () => mediaService.getMediaByQuestionGroupId(groupId!),
    enabled: Boolean(groupId),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook lấy chi tiết 1 tài nguyên media
 */
export function useMediaDetail(id?: string) {
  return useQuery({
    queryKey: mediaKeys.detail(id),
    queryFn: () => mediaService.getMediaById(id!),
    enabled: Boolean(id),
  });
}

/**
 * Mutation upload trực tiếp 1 tệp media (Presigned URL -> Storage -> Confirm)
 */
export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      target,
      onProgress,
    }: {
      file: File;
      target?: { questionId?: string | null; questionGroupId?: string | null };
      onProgress?: (percent: number) => void;
    }) => {
      return mediaService.orchestratedUploadFlow(file, { target, onProgress });
    },
    onSuccess: (data) => {
      if (data.questionId) {
        queryClient.invalidateQueries({ queryKey: mediaKeys.question(data.questionId) });
      }
      if (data.questionGroupId) {
        queryClient.invalidateQueries({ queryKey: mediaKeys.group(data.questionGroupId) });
      }
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

/**
 * Mutation xin presigned URL hàng loạt
 */
export function useUploadBatchMedia() {
  return useMutation<BatchPresignedUrlResult, Error, BatchPresignedUrlDto>({
    mutationFn: (dto) => mediaService.createBatchPresignedUrls(dto),
  });
}

/**
 * Mutation cập nhật/chuyển đổi target của tài nguyên media
 */
export function useUpdateMediaTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMediaTargetDto }) => {
      return mediaService.updateTarget(id, dto);
    },
    onSuccess: (data) => {
      if (data.questionId) {
        queryClient.invalidateQueries({ queryKey: mediaKeys.question(data.questionId) });
      }
      if (data.questionGroupId) {
        queryClient.invalidateQueries({ queryKey: mediaKeys.group(data.questionGroupId) });
      }
      queryClient.invalidateQueries({ queryKey: mediaKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

/**
 * Mutation xóa mềm tài nguyên media
 */
export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mediaService.deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}
