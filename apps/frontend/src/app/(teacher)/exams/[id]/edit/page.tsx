"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Loader2, Sliders } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ExamForm } from "@/features/exams/components/manage/exam-form";
import { ExamConflictModal } from "@/features/exams/components/exam-conflict-modal";
import { useExamManageDetail, useUpdateExam } from "@/hooks/use-exams";
import {
  buildUpdateExamPayload,
  ExamFormValues,
} from "@/lib/validations/exam.schema";

export default function EditExamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const examId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const {
    data: exam,
    isLoading,
    error,
    refetch,
  } = useExamManageDetail(examId);
  const updateMutation = useUpdateExam();
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [serverTitleError, setServerTitleError] = useState<string | null>(null);

  if (!examId || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm">Đang tải thông tin cấu hình đề thi...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 max-w-lg mx-auto my-12 space-y-4">
        <p className="font-semibold text-rose-600 dark:text-rose-400">
          Không tìm thấy đề thi hoặc bạn không có quyền chỉnh sửa.
        </p>
        <Button asChild size="sm" className="rounded-xl bg-indigo-600 text-white">
          <Link href="/exams/manage">Quay lại danh sách đề thi</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (values: ExamFormValues) => {
    setServerTitleError(null);
    const dto = buildUpdateExamPayload(exam, values);
    try {
      await updateMutation.mutateAsync({ id: exam.id, dto });
      router.push("/exams/manage");
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "errorCode" in err &&
        (err as { errorCode?: string }).errorCode ===
          "ERR_EXAM_TITLE_ALREADY_EXISTS"
      ) {
        const message =
          "message" in err && typeof (err as { message?: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Tiêu đề đề thi đã tồn tại. Vui lòng chọn tiêu đề khác.";
        setServerTitleError(message);
        return;
      }
      if (
        err &&
        typeof err === "object" &&
        "statusCode" in err &&
        (err as { statusCode: number }).statusCode === 409
      ) {
        setIsConflictOpen(true);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/exams/manage" aria-label="Quay lại Quản lý đề thi">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Chỉnh sửa cấu hình đề thi
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold">
                v{exam.version}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ID: {exam.id}
            </p>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
          <Link href={`/exams/${exam.slug || exam.id}/builder`}>
            <Sliders className="w-3.5 h-3.5 mr-1.5" />
            Mở trình xây dựng cấu trúc (Builder)
          </Link>
        </Button>
      </div>

      <ExamForm
        mode="edit"
        initialExam={exam}
        isSubmitting={updateMutation.isPending}
        serverTitleError={serverTitleError}
        onClearServerTitleError={() => setServerTitleError(null)}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/exams/manage")}
      />

      <ExamConflictModal
        isOpen={isConflictOpen}
        onClose={() => setIsConflictOpen(false)}
        onReload={() => refetch()}
      />
    </div>
  );
}
