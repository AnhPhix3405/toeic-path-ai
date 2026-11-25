"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ExamForm } from "@/features/exams/components/manage/exam-form";
import { useCreateExam } from "@/hooks/use-exams";
import {
  buildCreateExamPayload,
  ExamFormValues,
} from "@/lib/validations/exam.schema";

export default function CreateExamPage() {
  const router = useRouter();
  const createMutation = useCreateExam();
  const [serverTitleError, setServerTitleError] = useState<string | null>(null);

  const handleSubmit = async (values: ExamFormValues) => {
    setServerTitleError(null);
    const dto = buildCreateExamPayload(values);
    try {
      const created = await createMutation.mutateAsync(dto);
      router.push(`/exams/${created.slug || created.id}/builder`);
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
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumbs />

      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/exams/manage" aria-label="Quay lại Quản lý đề thi">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Khởi tạo đề thi TOEIC mới
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Thiết lập thông số cơ bản trước khi chuyển sang bước nạp cấu trúc
              câu hỏi (Exam Builder)
            </p>
          </div>
        </div>
      </div>

      <ExamForm
        mode="create"
        isSubmitting={createMutation.isPending}
        serverTitleError={serverTitleError}
        onClearServerTitleError={() => setServerTitleError(null)}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/exams/manage")}
      />
    </div>
  );
}
