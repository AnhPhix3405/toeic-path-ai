"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit3, Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { SingleQuestionForm } from "@/features/questions/components/single-question-form";
import { useQuestion } from "@/hooks/use-questions";

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const questionId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const { data: question, isLoading, isPending, error, refetch } = useQuestion(questionId);

  // Guard: wait until questionId is resolved and query finishes fetching
  if (!questionId || isLoading || isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm">Đang tải thông tin câu hỏi...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 max-w-lg mx-auto my-12 space-y-4">
        <div className="text-rose-600 dark:text-rose-400 font-semibold text-base">
          Không tìm thấy câu hỏi hoặc câu hỏi đã bị xóa.
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mã định danh câu hỏi: <code className="font-mono">{questionId}</code>
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
            Thử tải lại
          </Button>
          <Button asChild size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link href="/questions">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Quay lại ngân hàng câu hỏi
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex items-center gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Edit3 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Chỉnh sửa câu hỏi TOEIC
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cập nhật nội dung, đáp án chính xác hoặc phân loại lại mức độ khó
          </p>
        </div>
      </div>

      <SingleQuestionForm mode="edit" initialQuestion={question} />
    </div>
  );
}
