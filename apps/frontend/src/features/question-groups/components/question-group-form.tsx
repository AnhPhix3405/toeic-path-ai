"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Film, Loader2, Plus, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  QuestionGroupFormValues,
  questionGroupSchema,
} from "@/lib/validations/question-group.schema";
import { PassageViewer } from "./passage-viewer";
import {
  useCreateQuestionGroup,
  useUpdateQuestionGroup,
} from "@/hooks/use-question-groups";
import { QuestionGroup } from "@/types/question";
import { toast } from "sonner";
import { MediaAttachmentList } from "@/features/media/components/media-attachment-list";
import { MediaManagerModal } from "@/features/media/components/media-manager-modal";
import { useQuestionGroupMedia, useDeleteMedia } from "@/hooks/use-media";

interface QuestionGroupFormProps {
  initialGroup?: QuestionGroup | null;
  mode?: "create" | "edit";
}

export function QuestionGroupForm({
  initialGroup,
  mode = "create",
}: QuestionGroupFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const createMutation = useCreateQuestionGroup();
  const updateMutation = useUpdateQuestionGroup();
  const deleteMediaMutation = useDeleteMedia();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const groupId = initialGroup?.id;
  const { data: mediaItems = [], isLoading: isMediaLoading } = useQuestionGroupMedia(groupId);

  const form = useForm<QuestionGroupFormValues>({
    resolver: zodResolver(questionGroupSchema),
    defaultValues: {
      title: initialGroup?.title || "",
      context: initialGroup?.context || "",
    },
  });

  const {
    watch,
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const currentValues = watch();

  const onSubmit = async (values: QuestionGroupFormValues) => {
    setServerError(null);

    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync({
          title: values.title?.trim() || undefined,
          context: values.context.trim(),
        });
        toast.success("Tạo nhóm câu hỏi thành công!");
        router.push(`/question-groups/${created.id}`);
      } else if (initialGroup) {
        await updateMutation.mutateAsync({
          id: initialGroup.id,
          dto: {
            title: values.title?.trim() || undefined,
            context: values.context.trim(),
          },
        });
        toast.success("Cập nhật nhóm câu hỏi thành công!");
        router.push(`/question-groups/${initialGroup.id}`);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu nhóm câu hỏi";
      setServerError(msg);
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Left Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tiêu đề nhóm câu hỏi (Tùy chọn)
              </label>
              <Input
                {...register("title")}
                disabled={isSubmitting}
                placeholder="Ví dụ: Questions 153-155: E-mail from Regional Sales Manager"
                className="h-10 rounded-xl"
              />
              {errors.title && (
                <p className="text-xs text-rose-500 font-medium">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Context Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Đoạn văn / Ngữ cảnh bài đọc (Passage) <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">
                  {currentValues.context?.length || 0} ký tự
                </span>
              </div>
              <Textarea
                {...register("context")}
                disabled={isSubmitting}
                placeholder="Dán hoặc soạn thảo bài đọc, email, thư từ hoặc đoạn văn bản ngữ cảnh chung tại đây..."
                className={`min-h-[260px] rounded-xl text-sm leading-relaxed ${
                  errors.context ? "border-rose-500 focus-visible:ring-rose-500" : ""
                }`}
              />
              {errors.context && (
                <p className="text-xs text-rose-500 font-medium">
                  {errors.context.message}
                </p>
              )}
            </div>
          </div>

          {/* Media Resources Section (UC13) */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Film className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Tài nguyên Audio & Hình ảnh cho nhóm
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Đính kèm bài nghe hội thoại chung (Part 3, 4 Audio) hoặc tài liệu bài đọc (Part 7 Images).
                </p>
              </div>

              {groupId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsMediaModalOpen(true)}
                  disabled={isSubmitting}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Quản lý tài nguyên
                </Button>
              )}
            </div>

            {groupId ? (
              <MediaAttachmentList
                mediaItems={mediaItems}
                isLoading={isMediaLoading}
                onDelete={async (id) => {
                  await deleteMediaMutation.mutateAsync(id);
                }}
              />
            ) : (
              <div className="p-4 rounded-xl border border-dashed text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                Lưu nhóm câu hỏi trước để đính kèm tệp âm thanh nghe chung hoặc hình ảnh tài liệu.
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/question-groups")}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Quay lại danh sách
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm px-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {mode === "create" ? "Tạo nhóm câu hỏi" : "Lưu thay đổi"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live Passage Preview Right Column */}
        <div className="lg:col-span-5 sticky top-6">
          <PassageViewer
            title={currentValues.title || "Xem trước bài đọc"}
            context={
              currentValues.context ||
              "Đoạn văn ngữ cảnh xem trước sẽ hiển thị tại đây khi bạn soạn thảo..."
            }
          />
        </div>
      </div>

      {/* Media Manager Modal */}
      {groupId && (
        <MediaManagerModal
          open={isMediaModalOpen}
          onOpenChange={setIsMediaModalOpen}
          target={{ questionGroupId: groupId }}
          title="Quản lý tài nguyên nhóm câu hỏi"
        />
      )}
    </form>
  );
}
