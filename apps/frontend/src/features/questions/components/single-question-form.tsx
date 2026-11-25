"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldErrors, Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  Film,
  Loader2,
  Lock,
  Plus,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  areOptionContentsOptionalForPart,
  createSingleQuestionSchema,
  isQuestionContentOptionalForPart,
  SingleQuestionFormValues,
} from "@/lib/validations/question.schema";
import { QuestionOptionsEditor } from "./question-options-editor";
import { TaxonomySelector } from "./taxonomy-selector";
import { QuestionPreviewCard } from "./question-preview-card";
import { QuestionStatusBadge } from "./question-status-badge";
import { questionsService } from "@/services/questions.service";
import { Question } from "@/types/question";
import { toast } from "sonner";
import { MediaAttachmentList } from "@/features/media/components/media-attachment-list";
import { MediaManagerModal } from "@/features/media/components/media-manager-modal";
import { useQuestionMedia, useDeleteMedia } from "@/hooks/use-media";
import { useToeicParts } from "@/hooks/use-classification";

interface SingleQuestionFormProps {
  initialQuestion?: Question | null;
  mode?: "create" | "edit";
}

const defaultOptions = [
  { content: "", position: 1, isCorrect: true },
  { content: "", position: 2, isCorrect: false },
  { content: "", position: 3, isCorrect: false },
  { content: "", position: 4, isCorrect: false },
];

export function SingleQuestionForm({
  initialQuestion,
  mode = "create",
}: SingleQuestionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // PM Point 2: Read-only guard for published/pending_review questions in edit mode
  const isReadOnly =
    mode === "edit" &&
    (initialQuestion?.status === "published" ||
      initialQuestion?.status === "pending_review");

  // Media Query & Mutation
  const questionId = initialQuestion?.id;
  const { data: mediaItems = [], isLoading: isMediaLoading } = useQuestionMedia(questionId);
  const deleteMediaMutation = useDeleteMedia();
  const { data: toeicParts = [] } = useToeicParts();

  const partNumberById = useMemo(() => {
    const map = new Map<string, number>();
    toeicParts.forEach((p) => map.set(p.id, p.partNumber));
    if (initialQuestion?.part?.id && initialQuestion.part.partNumber) {
      map.set(initialQuestion.part.id, initialQuestion.part.partNumber);
    }
    return map;
  }, [toeicParts, initialQuestion?.part?.id, initialQuestion?.part?.partNumber]);

  const dynamicResolver: Resolver<SingleQuestionFormValues> = async (
    values,
    context,
    options
  ) => {
    const partNumber = values.partId
      ? partNumberById.get(values.partId) ?? null
      : null;
    const schema = createSingleQuestionSchema(partNumber);
    return zodResolver(schema)(values, context, options);
  };

  const form = useForm<SingleQuestionFormValues>({
    resolver: dynamicResolver,
    defaultValues: {
      content: initialQuestion?.content || "",
      explanation: initialQuestion?.explanation || "",
      partId: initialQuestion?.part?.id || "",
      difficulty: initialQuestion?.difficulty || "medium",
      topicIds: initialQuestion?.topics?.map((t) => t.id) || [],
      skillIds: initialQuestion?.skills?.map((s) => s.id) || [],
      options:
        initialQuestion?.options && initialQuestion.options.length >= 2
          ? initialQuestion.options.map((opt, idx) => ({
              id: opt.id,
              content: opt.content || "",
              position: opt.position ?? idx + 1,
              isCorrect: opt.isCorrect,
            }))
          : defaultOptions,
    },
  });

  const {
    watch,
    setValue,
    clearErrors,
    handleSubmit,
    formState: { errors },
  } = form;

  const currentValues = watch();
  const selectedPartNumber = currentValues.partId
    ? partNumberById.get(currentValues.partId) ?? null
    : null;
  const isContentOptional = isQuestionContentOptionalForPart(selectedPartNumber);
  const areOptionContentsOptional =
    areOptionContentsOptionalForPart(selectedPartNumber);

  const optionFieldErrors = useMemo(() => {
    const map: Record<number, string> = {};
    if (Array.isArray(errors.options)) {
      errors.options.forEach((optErr, idx) => {
        if (optErr?.content?.message) {
          map[idx] = String(optErr.content.message);
        }
      });
    }
    return map;
  }, [errors.options]);

  const optionsArrayErrorMessage =
    !Array.isArray(errors.options) && errors.options?.message
      ? String(errors.options.message)
      : (errors.options as { root?: { message?: string } } | undefined)?.root
          ?.message || null;

  const onInvalid = (formErrors: FieldErrors<SingleQuestionFormValues>) => {
    const messages: string[] = [];
    if (formErrors.content?.message) {
      messages.push(String(formErrors.content.message));
    }
    if (Array.isArray(formErrors.options)) {
      formErrors.options.forEach((optErr, idx) => {
        if (optErr?.content?.message) {
          const label = String.fromCharCode(65 + idx);
          messages.push(`Phương án ${label}: ${optErr.content.message}`);
        }
      });
    } else if (formErrors.options?.message) {
      messages.push(String(formErrors.options.message));
    } else {
      const rootMsg = (
        formErrors.options as { root?: { message?: string } } | undefined
      )?.root?.message;
      if (rootMsg) messages.push(rootMsg);
    }
    if (formErrors.partId?.message) {
      messages.push(String(formErrors.partId.message));
    }
    if (formErrors.difficulty?.message) {
      messages.push(String(formErrors.difficulty.message));
    }

    const summary =
      messages[0] ||
      "Vui lòng kiểm tra và điền đầy đủ các trường bắt buộc trước khi lưu.";
    toast.error(summary);
  };

  const onSubmit = async (values: SingleQuestionFormValues) => {
    if (isReadOnly) return;
    setIsSubmitting(true);
    setServerError(null);

    try {
      if (mode === "create") {
        // PM Point 1: Composite creation flow orchestration
        const created = await questionsService.createCompositeQuestion({
          content: values.content?.trim() || undefined,
          questionType: "single_choice",
          explanation: values.explanation?.trim() || undefined,
          partId: values.partId,
          difficulty: values.difficulty,
          topicIds: values.topicIds,
          skillIds: values.skillIds,
          options: values.options.map((opt) => ({
            content: opt.content?.trim() || undefined,
            position: opt.position,
            isCorrect: opt.isCorrect,
          })),
        });

        toast.success("Tạo câu hỏi TOEIC thành công!");
        router.push(`/questions/${created.questionCode || created.id}`);
      } else if (initialQuestion) {
        // Edit mode: Update question content, classification, option texts, and correct answer
        await questionsService.updateQuestion(initialQuestion.id, {
          content: values.content,
          explanation: values.explanation || undefined,
        });

        await questionsService.updateClassification(initialQuestion.id, {
          partId: values.partId,
          difficulty: values.difficulty,
          topicIds: values.topicIds,
          skillIds: values.skillIds,
        });

        const originalById = new Map(
          (initialQuestion.options || []).map((o) => [o.id, o])
        );
        const optionUpdates = values.options
          .filter((opt) => {
            if (!opt.id) return false;
            const orig = originalById.get(opt.id);
            return orig && orig.content !== opt.content;
          })
          .map((opt) =>
            questionsService.updateOption(initialQuestion.id, opt.id!, {
              content: opt.content,
            })
          );
        if (optionUpdates.length > 0) {
          await Promise.all(optionUpdates);
        }

        // Set correct answer if changed
        const correctOption = values.options.find((o) => o.isCorrect);
        if (correctOption && correctOption.id) {
          await questionsService.setCorrectAnswer(initialQuestion.id, {
            optionId: correctOption.id,
          });
        }

        toast.success("Cập nhật câu hỏi thành công!");
        router.push(
          `/questions/${initialQuestion.questionCode || initialQuestion.id}`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi lưu câu hỏi. Vui lòng kiểm tra lại thông tin.";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="space-y-6"
    >
      {/* Read-Only Status Guard Notice */}
      {isReadOnly && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300">
          <Lock className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold flex items-center">
              Câu hỏi này đang ở trạng thái
              <QuestionStatusBadge status={initialQuestion.status} className="ml-1.5" />
            </div>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
              Câu hỏi đã xuất bản hoặc đang chờ duyệt không thể chỉnh sửa trực tiếp để đảm bảo tính toàn vẹn của ngân hàng đề thi.
            </p>
          </div>
        </div>
      )}

      {/* Global Server Error Alert */}
      {serverError && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Lỗi lưu câu hỏi</p>
            <p className="mt-0.5 text-xs">{serverError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Editor Fields */}
        <div className="lg:col-span-7 space-y-6">
          {/* Question Content */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Nội dung câu hỏi (Question Content){" "}
                {!isContentOptional && <span className="text-rose-500">*</span>}
              </label>
              {isContentOptional && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {selectedPartNumber === 6
                    ? "Part 6: Không bắt buộc nhập nội dung riêng"
                    : `Part ${selectedPartNumber}: Không bắt buộc (nội dung nằm trong Audio)`}
                </span>
              )}
            </div>
            <Textarea
              disabled={isReadOnly || isSubmitting}
              value={currentValues.content}
              onChange={(e) => setValue("content", e.target.value, { shouldValidate: true })}
              placeholder={
                isContentOptional
                  ? "Tùy chọn: có thể để trống với câu hỏi Part 1, Part 2 hoặc Part 6..."
                  : "Nhập nội dung câu hỏi TOEIC (ví dụ: Mr. Henderson requested that all team members ______ the meeting...)"
              }
              className="min-h-[120px] rounded-xl text-base"
            />
            {errors.content && (
              <p className="text-xs text-rose-500 font-medium">{errors.content.message}</p>
            )}
          </div>

          {/* Options Editor */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            {areOptionContentsOptional && (
              <p className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                Part {selectedPartNumber}: Nội dung các phương án A/B/C/D nằm trong tệp Audio — bạn có thể để trống văn bản và chỉ cần chọn đáp án đúng.
              </p>
            )}
            <QuestionOptionsEditor
              disabled={isReadOnly || isSubmitting}
              options={currentValues.options}
              errors={optionFieldErrors}
              onChange={(updated) => setValue("options", updated, { shouldValidate: true })}
            />
            {optionsArrayErrorMessage && (
              <p role="alert" className="text-xs text-rose-500 font-medium mt-2">
                {optionsArrayErrorMessage}
              </p>
            )}
          </div>

          {/* Media Resources Section (UC13) */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Film className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Tài nguyên đa phương tiện (Audio & Hình ảnh)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Đính kèm hình ảnh minh họa (Part 1 Photograph) hoặc tệp âm thanh câu hỏi (Part 1, 2).
                </p>
              </div>

              {questionId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsMediaModalOpen(true)}
                  disabled={isReadOnly || isSubmitting}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Quản lý tài nguyên
                </Button>
              )}
            </div>

            {questionId ? (
              <MediaAttachmentList
                mediaItems={mediaItems}
                parentStatus={initialQuestion?.status}
                isLoading={isMediaLoading}
                onDelete={async (id) => {
                  await deleteMediaMutation.mutateAsync(id);
                }}
              />
            ) : (
              <div className="p-4 rounded-xl border border-dashed text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                Lưu bản nháp câu hỏi trước để đính kèm tệp âm thanh hoặc hình ảnh dung lượng lớn trực tiếp.
              </div>
            )}
          </div>

          {/* Taxonomy Selector */}
          <TaxonomySelector
            disabled={isReadOnly || isSubmitting}
            partId={currentValues.partId}
            onPartIdChange={(partId) => {
              setValue("partId", partId, { shouldValidate: true });
              clearErrors(["content", "options"]);
            }}
            difficulty={currentValues.difficulty}
            onDifficultyChange={(difficulty) => setValue("difficulty", difficulty, { shouldValidate: true })}
            selectedTopicIds={currentValues.topicIds}
            onTopicToggle={(topicId) => {
              const current = currentValues.topicIds;
              const next = current.includes(topicId)
                ? current.filter((id) => id !== topicId)
                : [...current, topicId];
              setValue("topicIds", next);
            }}
            selectedSkillIds={currentValues.skillIds}
            onSkillToggle={(skillId) => {
              const current = currentValues.skillIds;
              const next = current.includes(skillId)
                ? current.filter((id) => id !== skillId)
                : [...current, skillId];
              setValue("skillIds", next);
            }}
            partError={errors.partId?.message}
          />

          {/* Explanation Textarea */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Lời giải chi tiết (Explanation)
            </label>
            <Textarea
              disabled={isReadOnly || isSubmitting}
              value={currentValues.explanation || ""}
              onChange={(e) => setValue("explanation", e.target.value)}
              placeholder="Giải thích vì sao đáp án này đúng, ngữ pháp hoặc từ vựng trọng điểm..."
              className="min-h-[100px] rounded-xl text-sm"
            />
          </div>

          {/* Form Actions Bottom */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/questions")}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Quay lại danh sách
            </Button>

            {!isReadOnly && (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm px-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang lưu câu hỏi...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {mode === "create" ? "Lưu câu hỏi mới" : "Cập nhật câu hỏi"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: Live Real-Time TOEIC Preview Card */}
        <div className="lg:col-span-5">
          <QuestionPreviewCard
            formValues={currentValues}
            questionId={questionId}
            mediaItems={mediaItems}
          />
        </div>
      </div>

      {/* Media Manager Modal */}
      {questionId && (
        <MediaManagerModal
          open={isMediaModalOpen}
          onOpenChange={setIsMediaModalOpen}
          target={{ questionId }}
          parentStatus={initialQuestion?.status}
        />
      )}
    </form>
  );
}
