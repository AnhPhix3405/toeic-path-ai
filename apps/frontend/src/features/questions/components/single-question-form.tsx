"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  SingleQuestionFormValues,
  singleQuestionSchema,
} from "@/lib/validations/question.schema";
import { QuestionOptionsEditor } from "./question-options-editor";
import { TaxonomySelector } from "./taxonomy-selector";
import { QuestionPreviewCard } from "./question-preview-card";
import { QuestionStatusBadge } from "./question-status-badge";
import { questionsService } from "@/services/questions.service";
import { Question } from "@/types/question";
import { toast } from "sonner";

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

  // PM Point 2: Read-only guard for published/pending_review questions in edit mode
  const isReadOnly =
    mode === "edit" &&
    (initialQuestion?.status === "published" ||
      initialQuestion?.status === "pending_review");

  const form = useForm<SingleQuestionFormValues>({
    resolver: zodResolver(singleQuestionSchema),
    defaultValues: {
      content: initialQuestion?.content || "",
      explanation: initialQuestion?.explanation || "",
      partId: initialQuestion?.part?.id || "",
      difficulty: initialQuestion?.difficulty || "medium",
      topicIds: initialQuestion?.topics?.map((t) => t.id) || [],
      skillIds: initialQuestion?.skills?.map((s) => s.id) || [],
      options:
        initialQuestion?.options && initialQuestion.options.length >= 2
          ? initialQuestion.options.map((opt) => ({
              id: opt.id,
              content: opt.content,
              position: opt.position,
              isCorrect: opt.isCorrect,
            }))
          : defaultOptions,
    },
  });

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;

  const currentValues = watch();

  const onSubmit = async (values: SingleQuestionFormValues) => {
    if (isReadOnly) return;
    setIsSubmitting(true);
    setServerError(null);

    try {
      if (mode === "create") {
        // PM Point 1: Composite creation flow orchestration
        const created = await questionsService.createCompositeQuestion({
          content: values.content,
          questionType: "single_choice",
          explanation: values.explanation || undefined,
          partId: values.partId,
          difficulty: values.difficulty,
          topicIds: values.topicIds,
          skillIds: values.skillIds,
          options: values.options,
        });

        toast.success("Tạo câu hỏi TOEIC thành công!");
        router.push(`/questions/${created.id}`);
      } else if (initialQuestion) {
        // Edit mode: Update question content, classification, and options
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

        // Set correct answer if changed
        const correctOption = values.options.find((o) => o.isCorrect);
        if (correctOption && correctOption.id) {
          await questionsService.setCorrectAnswer(initialQuestion.id, {
            optionId: correctOption.id,
          });
        }

        toast.success("Cập nhật câu hỏi thành công!");
        router.push(`/questions/${initialQuestion.id}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu câu hỏi";
      setServerError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Top Advisory Banner for Read-Only Mode (PM Point 2) */}
      {isReadOnly && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300">
          <Lock className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold flex items-center">
              Câu hỏi này đang ở trạng thái
              <QuestionStatusBadge status={initialQuestion!.status} className="ml-1.5" />
            </div>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
              Câu hỏi đã xuất bản hoặc đang chờ duyệt không thể chỉnh sửa trực tiếp để đảm bảo tính toàn vẹn của ngân hàng đề thi.
            </p>
          </div>
        </div>
      )}

      {/* Server Error Alert */}
      {serverError && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Không thể lưu câu hỏi</p>
            <p className="text-xs mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Form Left, Sticky Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Fields */}
        <div className="lg:col-span-7 space-y-6">
          {/* Question Content Box */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Nội dung câu hỏi (Question Content) <span className="text-rose-500">*</span>
            </label>
            <Textarea
              disabled={isReadOnly || isSubmitting}
              value={currentValues.content}
              onChange={(e) => setValue("content", e.target.value, { shouldValidate: true })}
              placeholder="Nhập nội dung câu hỏi TOEIC (ví dụ: Mr. Henderson requested that all team members ______ the meeting...)"
              className={`min-h-[120px] rounded-xl text-base ${
                errors.content ? "border-rose-500 focus-visible:ring-rose-500" : ""
              }`}
            />
            {errors.content && (
              <p className="text-xs text-rose-500 font-medium">
                {errors.content.message}
              </p>
            )}
          </div>

          {/* Options Editor */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <QuestionOptionsEditor
              disabled={isReadOnly || isSubmitting}
              options={currentValues.options}
              onChange={(updated) => setValue("options", updated, { shouldValidate: true })}
            />
            {errors.options && (
              <p className="text-xs text-rose-500 font-medium mt-2">
                {errors.options.message}
              </p>
            )}
          </div>

          {/* Taxonomy Selector */}
          <TaxonomySelector
            disabled={isReadOnly || isSubmitting}
            partId={currentValues.partId}
            onPartIdChange={(partId) => setValue("partId", partId, { shouldValidate: true })}
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
          <QuestionPreviewCard formValues={currentValues} />
        </div>
      </div>
    </form>
  );
}
