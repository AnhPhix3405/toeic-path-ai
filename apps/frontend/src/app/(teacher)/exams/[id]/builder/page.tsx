"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Edit2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ExamPublishingPanel } from "@/features/exams/components/publishing/exam-publishing-panel";
import { ExamSectionsConfigurator } from "@/features/exams/components/builder/exam-sections-configurator";
import { ExamStructureWorkspace } from "@/features/exams/components/builder/exam-structure-workspace";
import { ExamQuestionPickerModal } from "@/features/exams/components/builder/exam-question-picker-modal";
import { ExamAutoGenerateModal } from "@/features/exams/components/builder/exam-auto-generate-modal";
import { ExamConflictModal } from "@/features/exams/components/exam-conflict-modal";
import {
  useAddExamQuestions,
  useArchiveExam,
  useAutoGenerateExam,
  useCloseExam,
  useConfigureExamSections,
  useExamStructure,
  usePublishExam,
  useRemoveExamQuestion,
  useReorderExamQuestions,
  useUnpublishExam,
} from "@/hooks/use-exams";
import { useQuestions } from "@/hooks/use-questions";
import { questionGroupsService } from "@/services/question-groups.service";
import {
  ExamSectionItem,
  PublishChecklistErrorInfo,
} from "@/types/exam";

export default function ExamBuilderPage() {
  const params = useParams<{ id: string }>();
  const examId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const {
    data: structure,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useExamStructure(examId);

  const configureSectionsMutation = useConfigureExamSections();
  const addQuestionsMutation = useAddExamQuestions();
  const reorderMutation = useReorderExamQuestions();
  const removeQuestionMutation = useRemoveExamQuestion();
  const autoGenerateMutation = useAutoGenerateExam();

  const publishMutation = usePublishExam();
  const unpublishMutation = useUnpublishExam();
  const closeMutation = useCloseExam();
  const archiveMutation = useArchiveExam();

  const [pickerSection, setPickerSection] = useState<ExamSectionItem | null>(
    null
  );
  const [isAutoGenOpen, setIsAutoGenOpen] = useState(false);
  const [autoGenError, setAutoGenError] = useState<string | null>(null);
  const [checklistError, setChecklistError] =
    useState<PublishChecklistErrorInfo | null>(null);
  const [isConflictOpen, setIsConflictOpen] = useState(false);

  // Load published questions & question groups when picker modal is open
  const { data: publishedQuestionsData, isLoading: isQuestionsLoading } =
    useQuestions(
      pickerSection
        ? {
            status: "published",
            partId: pickerSection.partId,
            limit: 50,
          }
        : undefined
    );

  const { data: questionGroupsData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ["question-groups"],
    queryFn: () => questionGroupsService.getQuestionGroups(),
    enabled: Boolean(pickerSection),
  });

  const handleApiError = (err: unknown) => {
    if (err && typeof err === "object") {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 409) {
        setIsConflictOpen(true);
        return true;
      }
    }
    return false;
  };

  if (!examId || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm">Đang tải cấu trúc đề thi (Exam Builder)...</p>
      </div>
    );
  }

  if (error || !structure) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 max-w-lg mx-auto my-12 space-y-4">
        <p className="font-semibold text-rose-600 dark:text-rose-400">
          Không tìm thấy cấu trúc đề thi hoặc bạn không có quyền truy cập.
        </p>
        <Button
          asChild
          size="sm"
          className="rounded-xl bg-indigo-600 text-white"
        >
          <Link href="/exams/manage">Quay lại danh sách đề thi</Link>
        </Button>
      </div>
    );
  }

  const totalTargetQuestions = (structure.sections || []).reduce(
    (sum, sec) => sum + sec.targetQuestionsCount,
    0
  );

  const isMutating =
    configureSectionsMutation.isPending ||
    addQuestionsMutation.isPending ||
    reorderMutation.isPending ||
    removeQuestionMutation.isPending ||
    autoGenerateMutation.isPending ||
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    closeMutation.isPending ||
    archiveMutation.isPending;

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Top Navigation & Refresh Bar (#1007) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs">
          <Link href="/exams/manage">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Quay lại Quản lý đề thi
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => refetch()}
            className="rounded-xl text-xs cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${
                isFetching ? "animate-spin text-indigo-600" : ""
              }`}
            />
            Làm mới
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
          >
            <Link href={`/exams/${structure.id}/edit`}>
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Chỉnh sửa thông số đề
            </Link>
          </Button>
        </div>
      </div>

      {/* Publishing & Lifecycle Status Panel (Task 4 - UC18) */}
      <ExamPublishingPanel
        examId={structure.id}
        title={structure.title}
        type={structure.type}
        status={structure.status}
        version={structure.version}
        totalActualQuestions={structure.totalQuestions}
        totalTargetQuestions={totalTargetQuestions}
        checklistError={checklistError}
        isMutating={isMutating}
        onPublish={async (dto) => {
          setChecklistError(null);
          try {
            await publishMutation.mutateAsync({ id: structure.id, dto });
          } catch (err: unknown) {
            if (!handleApiError(err)) {
              const message =
                err && typeof err === "object" && "message" in err
                  ? String((err as { message: unknown }).message)
                  : "Đề thi chưa đạt đủ điều kiện thẩm định xuất bản.";
              const details =
                err && typeof err === "object" && "details" in err
                  ? (err as { details?: Record<string, unknown> }).details
                  : undefined;
              const invalidQuestionIds = Array.isArray(
                details?.invalidQuestionIds
              )
                ? (details.invalidQuestionIds as string[])
                : undefined;
              setChecklistError({
                message,
                invalidQuestionIds,
              });
            }
          }
        }}
        onUnpublish={async (dto) => {
          setChecklistError(null);
          try {
            await unpublishMutation.mutateAsync({ id: structure.id, dto });
          } catch (err: unknown) {
            handleApiError(err);
          }
        }}
        onCloseExam={async (dto) => {
          try {
            await closeMutation.mutateAsync({ id: structure.id, dto });
          } catch (err: unknown) {
            handleApiError(err);
          }
        }}
        onArchiveExam={async (dto) => {
          try {
            await archiveMutation.mutateAsync({ id: structure.id, dto });
          } catch (err: unknown) {
            handleApiError(err);
          }
        }}
      />

      {/* Section Configurator for Mini Test & Placement Test (Task 3 - UC17) */}
      {structure.type !== "full_test" && structure.status === "draft" && (
        <ExamSectionsConfigurator
          examType={structure.type}
          version={structure.version}
          initialSections={structure.sections || []}
          isSaving={configureSectionsMutation.isPending}
          onSave={async (dto) => {
            try {
              await configureSectionsMutation.mutateAsync({
                id: structure.id,
                dto,
              });
            } catch (err: unknown) {
              handleApiError(err);
            }
          }}
        />
      )}

      {/* Main Builder Workspace (Task 3 - UC17) */}
      <ExamStructureWorkspace
        structure={structure}
        isMutating={isMutating}
        onOpenQuestionPicker={(sec) => setPickerSection(sec)}
        onOpenAutoGenerate={() => {
          setAutoGenError(null);
          setIsAutoGenOpen(true);
        }}
        onReorderQuestions={async (items) => {
          try {
            await reorderMutation.mutateAsync({
              id: structure.id,
              dto: {
                version: structure.version,
                items,
              },
            });
          } catch (err: unknown) {
            handleApiError(err);
          }
        }}
        onRemoveQuestion={async (questionId) => {
          try {
            await removeQuestionMutation.mutateAsync({
              id: structure.id,
              questionId,
              version: structure.version,
            });
          } catch (err: unknown) {
            handleApiError(err);
          }
        }}
      />

      {/* Single / Group Question Picker Modal */}
      <ExamQuestionPickerModal
        isOpen={Boolean(pickerSection)}
        version={structure.version}
        section={pickerSection}
        existingQuestionIds={(structure.questions || []).map(
          (q) => q.questionId
        )}
        availableSingleQuestions={publishedQuestionsData?.data || []}
        availableQuestionGroups={questionGroupsData || []}
        isLoadingBank={isQuestionsLoading || isGroupsLoading}
        isSubmitting={addQuestionsMutation.isPending}
        onClose={() => setPickerSection(null)}
        onConfirmAdd={async (dto) => {
          try {
            await addQuestionsMutation.mutateAsync({
              id: structure.id,
              dto,
            });
            setPickerSection(null);
          } catch (err: unknown) {
            handleApiError(err);
          }
        }}
      />

      {/* Auto-Generate Exam Modal */}
      <ExamAutoGenerateModal
        isOpen={isAutoGenOpen}
        version={structure.version}
        sections={structure.sections || []}
        isGenerating={autoGenerateMutation.isPending}
        insufficientError={autoGenError}
        onClose={() => setIsAutoGenOpen(false)}
        onConfirmGenerate={async (dto) => {
          setAutoGenError(null);
          try {
            await autoGenerateMutation.mutateAsync({
              id: structure.id,
              dto,
            });
            setIsAutoGenOpen(false);
          } catch (err: unknown) {
            if (!handleApiError(err)) {
              const msg =
                err && typeof err === "object" && "message" in err
                  ? String((err as { message: unknown }).message)
                  : "Ngân hàng câu hỏi không đủ số lượng câu hỏi đã xuất bản để sinh đề tự động.";
              setAutoGenError(msg);
            }
          }
        }}
      />

      {/* 409 Optimistic Locking Conflict Modal */}
      <ExamConflictModal
        isOpen={isConflictOpen}
        onClose={() => setIsConflictOpen(false)}
        onReload={() => refetch()}
      />
    </div>
  );
}
